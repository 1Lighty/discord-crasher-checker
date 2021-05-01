/* —————————————— Copyright (c) 2021 1Lighty, All rights reserved ——————————————
*
* Be happy I don't keep it private :)
* PS, coding in JS sucks, I wish I had ts back :(
*
* ————————————————————————————————————————————————————————————————————————————— */
/* eslint-disable no-invalid-this */

const { Plugin } = require('powercord/entities');
const { findInReactTree } = require('powercord/util');
const { inject, uninject } = require('powercord/injector');
const { React, getModuleByDisplayName, getModule } = require('powercord/webpack');
const { Button, Flex, Text, Tooltip } = require('powercord/components');

const { Checking, DecodeError, Unsafe } = require('./Icons');
const { get } = require('powercord/http');
const { suppressErrors } = require('./utils/suppressErrors');
const Logger = new (require('./utils/Logger').Logger)();

class WorkerInterface {
  constructor() {
    this.queue = [];
  }
  start() {
    const webWorkerData = 'importScripts(\'https://1lighty.github.io/discord-crasher-checker/DCCWASMInterface.worker.js?commit=6ae1f623\');';
    const workerDataURL = window.URL.createObjectURL(new Blob([webWorkerData], { type: 'text/javascript' }));
    if (this.worker) this.stop();
    this.worker = new Worker(workerDataURL);
    this.worker.onmessage = this._onMessage.bind(this);
  }
  stop() {
    if (!this.worker) return;
    this.worker.terminate();
    this.worker = null;
  }
  /** @private */
  _onMessage(e) {
    const { data: { ret, isSafe, id } } = e;
    const idx = this.queue.findIndex(e => e.id === id);
    if (idx === -1) return Logger.warn(`Could not find ID ${id}`);
    const item = this.queue[idx];
    this.queue.splice(idx, 1);
    if (ret < 0) return item.rej(new Error(`Worker threw error ${ret}`));
    item.res(isSafe);
  }
  checkVideo(url) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (res, rej) => {
      try {
        const req = await get(url).execute();
        const blob = new Blob([req.body]);
        const file = new File([blob], 'file');
        const id = Math.ceil((Math.random() * 0xFFFFFFFFFF)).toString(16).toUpperCase();
        this.queue.push({ res, rej, id });
        this.worker.postMessage([ file, id ]);
      } catch (err) {
        rej(err);
      }
    });
  }
}


module.exports = class DiscordCrasherChecker extends Plugin {
  constructor() {
    super();
    this.worker = new WorkerInterface();
    this.cache = {};
  }
  // eslint-disable-next-line require-await
  async startPlugin() {
    this.worker.start();
    suppressErrors(this.patchMediaPlayer.bind(this))();
    suppressErrors(this.patchLazyImage.bind(this))();
    suppressErrors(this.patchGIFPickerSearchItem.bind(this))();
    this.loadStylesheet('style.css');
  }

  getCached(url) {
    const item = this.cache[url];
    if (!item) return null;
    item.lastAccess = Date.now();
    return item.isSafe;
  }

  setCached(url, isSafe) {
    this.cache[url] = { isSafe, lastAccess: Date.now() };
    const entries = Object.entries(this.cache);
    for (const [url, item] of entries) {
      if (Date.now() - item.lastAccess < 7.2e+6) continue; // 2 hours
      delete this.cache[url];
    }
  }

  patchMediaPlayer() {
    const MediaPlayer = getModuleByDisplayName('MediaPlayer', false);
    const _this = this;
    const patchId = Math.ceil((Math.random() * 0xFFFFFFFFFF)).toString(16).toUpperCase();
    inject('discord-crasher-checker-media-player-pre', MediaPlayer.prototype, 'render', function(args) {
      if (!this.state.hasClickedPlay) {
        const cachedVal = _this.getCached(this.props.src);
        if (typeof cachedVal === 'boolean') {
          this.state.__DCC_isSafe = cachedVal;
          if (!cachedVal) {
            this.state.hasClickedPlay = true;
            this.state.hideControls = false;
          }
          return args;
        }
      }

      // possibly check content type first? we can't parse webms properly, not sure if they even cause crashes?
      if (this.handleVideoClick.__DCC_patched === patchId) return args;
      if (this.props.type !== 'VIDEO') return args;
      if (!this.__DCC_oHandleVideoClick) this.__DCC_oHandleVideoClick = this.handleVideoClick;
      this.handleVideoClick = e => {
        if (this.state.__DCC_isSafe || this.state.hasClickedPlay) return this.__DCC_oHandleVideoClick(e);
        if (this.state.__DCC_isChecking) return;
        this.setState({ __DCC_isChecking: true, hasClickedPlay: true, hideControls: true, __DCC_isSafe: false });
        _this.worker.checkVideo(this.props.src).then(isSafe => {
          this.setState({ __DCC_isChecking: false, hideControls: false, __DCC_isSafe: isSafe });
          _this.setCached(this.props.src, isSafe);
          if (isSafe) this.__DCC_oHandleVideoClick(e);
        }).catch(err => {
          Logger.error(err);
          this.setState({ __DCC_isChecking: false, hideControls: false, __DCC_error: true });
        });
      };
      this.handleVideoClick.__DCC_patched = patchId;
      return args;
    }, true);
    inject('discord-crasher-checker-media-player', MediaPlayer.prototype, 'render', function(_, ret) {
      if (this.handleVideoClick.__DCC_patched !== patchId) return ret;
      if (!this.state.hasClickedPlay) return ret;
      if (!this.state.__DCC_isChecking && !this.state.__DCC_error && this.state.__DCC_isSafe) return ret;
      const { children } = findInReactTree(ret, e => e && typeof e.className === 'string' && e.className.indexOf('wrapper-2TxpI8') !== -1) || {};
      if (!children) return ret;
      const idx = children.findIndex(e => e?.type?.displayName === 'Controls');
      children[idx] = null;
      children.push(<Flex align={Flex.Align.CENTER} justify={Flex.Justify.CENTER} direction={Flex.Direction.VERTICAL} className='dcc-backdrop' key='DCC-Checker'>
        <Text size={Text.Sizes.SIZE_20}>{
          this.state.__DCC_isChecking ? (
            <Tooltip text='Please wait, checking'>
              <Checking size={48}/>
            </Tooltip>) :
            this.state.__DCC_error ? (
              <Tooltip text='Decoder error'>
                <DecodeError size={48}/>
              </Tooltip>) :
              (
                <Tooltip text='This will crash you'>
                  <Unsafe size={48}/>
                </Tooltip>)
        }</Text>
        { !this.state.__DCC_error && !this.state.__DCC_isChecking ? (
          <Button look={Button.Looks.OUTLINED} onClick={e => {
            this.state.__DCC_isSafe = true;
            _this.setCached(this.props.src, true);
            this.__DCC_oHandleVideoClick(e);
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}>Override</Button>
        ) : null}
      </Flex>);
      return ret;
    });
  }

  patchLazyImage() {
    const LazyImage = getModuleByDisplayName('LazyImage', false);
    const _this = this;
    const vidKey = Math.ceil((Math.random() * 0xFFFFFFFFFF)).toString(16).toUpperCase();
    inject('discord-crasher-checker-lazy-image', LazyImage.prototype, 'render', function(_, ret) {
      if (!this.constructor.isAnimated(this.props)) return ret;
      const { children } = ret.props;
      if (typeof children !== 'function') return ret;
      ret.props.children = e => {
        try {
          const ret = children(e);
          if (findInReactTree(ret, e => e?.type?.displayName === 'MediaPlayer')) return ret;
          if (!this.state.__DCC_checked) {
            const cachedVal = _this.getCached(ret.props.src);
            if (typeof cachedVal === 'boolean') {
              this.state.__DCC_isSafe = cachedVal;
              this.state.__DCC_checked = true;
            }
          }
          if (!this.state.__DCC_checked && ret.props.play && !this.state.__DCC_isChecking) {
            this.state.__DCC_isChecking = true;
            _this.worker.checkVideo(ret.props.src).then(isSafe => {
              _this.setCached(ret.props.src, isSafe);
              this.setState({ __DCC_checked: true, __DCC_isChecking: false, __DCC_isSafe: isSafe });
            }).catch(err => {
              Logger.error(err);
              this.setState({ __DCC_checked: true, __DCC_isChecking: false, __DCC_error: true });
            });
          }

          ret.key = vidKey;

          // eslint-disable-next-line curly
          if (this.state.__DCC_isChecking || this.state.__DCC_error || (!this.state.__DCC_isSafe && this.state.__DCC_checked)) {
            ret.props.play = false;
            return [ret, (
              <Flex align={Flex.Align.CENTER} justify={Flex.Justify.CENTER} direction={Flex.Direction.VERTICAL} className='dcc-backdrop' key='DCC-Checker'>
                <Text size={Text.Sizes.SIZE_20}>{
                  this.state.__DCC_isChecking ? (
                    <Tooltip text='Please wait, checking'>
                      <Checking size={48}/>
                    </Tooltip>) :
                    this.state.__DCC_error ? (
                      <Tooltip text='Decoder error'>
                        <DecodeError size={48}/>
                      </Tooltip>) :
                      (
                        <Tooltip text='This will crash you'>
                          <Unsafe size={48}/>
                        </Tooltip>)
                }</Text>
                { !this.state.__DCC_error && !this.state.__DCC_isChecking ? (
                  <Button look={Button.Looks.OUTLINED} onClick={e => {
                    _this.setCached(ret.props.src, true);
                    this.setState({ __DCC_isSafe: true });
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                  }}>Override</Button>
                ) : null}
              </Flex>
            )];
          }
          return [ret];
        } catch (err) {
          Logger.error('Failed, lol', err);
          try {
            return children(e);
          } catch (err) {
            Logger.error('Fuck it', err);
            return null;
          }
        }
      };
      ret.props.children.__originalFunction = children;
      return ret;
    });
  }

  patchGIFPickerSearchItem() {
    const { GIFPickerSearchItem } = getModule(['GIFPickerSearchItem'], false);
    const _this = this;
    const ensureProtocol = url => {
      if (url.indexOf('http')) return `https:${url}`;
      return url;
    };
    inject('discord-crasher-checker-gif-picker-search-item-mount', GIFPickerSearchItem.prototype, 'componentDidMount', function(_, ret) {
      if (this.props.format !== 'VIDEO' || !this._video) return ret;
      const cachedVal = _this.getCached(ensureProtocol(this.props.src));
      this.state.__DCC_isSafe = cachedVal;
      if (cachedVal) return ret;
      const { _video } = this;
      _video.autoplay = false;
      this.setState({ __DCC_isChecking: true });
      _this.worker.checkVideo(ensureProtocol(this.props.src)).then(isSafe => {
        _this.setCached(ensureProtocol(this.props.src), isSafe);
        if (!_video) return; // bruh
        if (isSafe) {
          _video.autoplay = true;
          if (this._video) _video.play();
        }
        this.setState({ __DCC_checked: true, __DCC_isChecking: false, __DCC_isSafe: isSafe });
      }).catch(err => {
        Logger.error(err);
        this.setState({ __DCC_checked: true, __DCC_isChecking: false, __DCC_error: true });
      });
      return ret;
    });
    inject('discord-crasher-checker-gif-picker-search-item', GIFPickerSearchItem.prototype, 'render', function(_, ret) {
      if (this.props.format !== 'VIDEO' || _this.getCached(ensureProtocol(this.props.src)) || this.state.__DCC_isSafe) return ret;
      if (!findInReactTree(ret, e => e && typeof e.className === 'string' && !e.className.indexOf('favButton'))) return ret;
      ret.props.children = (
        <Flex align={Flex.Align.CENTER} justify={Flex.Justify.CENTER} direction={Flex.Direction.VERTICAL} className='dcc-backdrop' key='DCC-Checker'>
          <Text size={Text.Sizes.SIZE_20}>{
            this.state.__DCC_isChecking ? (
              <Tooltip text='Please wait, checking'>
                <Checking size={48}/>
              </Tooltip>) :
              this.state.__DCC_error ? (
                <Tooltip text='Decoder error'>
                  <DecodeError size={48}/>
                </Tooltip>) :
                (
                  <Tooltip text='This will crash you'>
                    <Unsafe size={48}/>
                  </Tooltip>)
          }</Text>
          { !this.state.__DCC_error && !this.state.__DCC_isChecking ? (
            <Button look={Button.Looks.OUTLINED} onClick={e => {
              _this.setCached(ensureProtocol(this.props.src), true);
              this._video.autoplay = true;
              this._video.play();
              this.setState({ __DCC_isSafe: true });
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}>Override</Button>
          ) : null}
        </Flex>
      );
      return ret;
    });
  }

  pluginWillUnload() {
    this.worker.stop();
    uninject('discord-crasher-checker-media-player-pre');
    uninject('discord-crasher-checker-media-player');
    uninject('discord-crasher-checker-lazy-image');
    uninject('discord-crasher-checker-gif-picker-search-item-mount');
    uninject('discord-crasher-checker-gif-picker-search-item');
  }
};
