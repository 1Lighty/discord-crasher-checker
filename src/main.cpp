/* —————————————— Copyright (c) 2021 1Lighty, All rights reserved ——————————————
*
* Open the file and read out what codec is required, if it's matroska or webm
* then just ignore it
* dts values of each packet have equal delta between each frame, crasher vids
* don't, abusing that fact for maximum performance
*
* ————————————————————————————————————————————————————————————————————————————— */

#include <emscripten.h>
#include <emscripten/bind.h>
#include <stdio.h>
#include <vector>

extern "C"
{
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libavutil/avutil.h>
#include <libavutil/imgutils.h>
};

enum ReturnStatus {
  SAFE = 0,
  UNSAFE
};

enum ReturnStatusError {
  OOM,
  AV,
  STREAM
};

#define ERRRET(t) -t

bool isSafeInternal(AVFormatContext* pFormatContext, AVCodecContext* pCodecContext, AVPacket* pPacket, AVFrame* pFrame, int videoStreamIDX) {
  std::string lastFormat = av_get_pix_fmt_name((AVPixelFormat)pCodecContext->pix_fmt);
  int lastWidth = pCodecContext->width;
  int lastHeight = pCodecContext->height;
  int readFrameRes = -1;
  bool reachedEOF = false;

  if (strcmp(pFormatContext->iformat->name, "matroska,webm")) {
    avformat_seek_file(pFormatContext, -1, INT64_MIN, pFormatContext->duration, pFormatContext->duration, 0);
    while ((readFrameRes = av_read_frame(pFormatContext, pPacket)) >= 0 || (!reachedEOF && readFrameRes == AVERROR_EOF && (reachedEOF = true))) {
      if (pPacket->stream_index == videoStreamIDX && avcodec_send_packet(pCodecContext, pPacket) >= 0) {
        avcodec_receive_frame(pCodecContext, pFrame);
        std::string fmt = av_get_pix_fmt_name((AVPixelFormat)pCodecContext->pix_fmt);
        if (lastFormat != fmt || lastWidth != pCodecContext->width || lastHeight != pCodecContext->height) return false;
      }
      av_packet_unref(pPacket);
    }
  }
  return true;
}

int isSafe(std::string filename) {
  av_log_set_level(AV_LOG_QUIET); // shut up

  AVFormatContext* pFormatContext = avformat_alloc_context();
  if (!pFormatContext) return ERRRET(OOM);

  {
    int ret = avformat_open_input(&pFormatContext, filename.c_str(), NULL, NULL);
    if (ret < 0) {
      fprintf(stderr, "%s\n", av_err2str(ret));
      return ERRRET(AV);
    }
  }

  if (avformat_find_stream_info(pFormatContext, NULL) < 0) return ERRRET(STREAM);

  AVCodecContext* pCodecContext = NULL;
  int videoStreamIDX = -1;

  for (int i = 0; i < pFormatContext->nb_streams; i++) {
    AVStream* pStream = pFormatContext->streams[i];
    AVCodecParameters* pCodecParams = pStream->codecpar;
    AVCodec* pCodec = avcodec_find_decoder(pCodecParams->codec_id);
    pCodecContext = avcodec_alloc_context3(pCodec);
    if (pCodecParams->codec_type != AVMEDIA_TYPE_VIDEO) continue;
    avcodec_parameters_to_context(pCodecContext, pCodecParams);
    avcodec_open2(pCodecContext, pCodec, NULL);
    videoStreamIDX = i;
    break;
  }

  AVPacket* pPacket = av_packet_alloc();
  AVFrame* pFrame = av_frame_alloc();

  auto ret = isSafeInternal(pFormatContext, pCodecContext, pPacket, pFrame, videoStreamIDX);

  avformat_close_input(&pFormatContext);
  av_frame_free(&pFrame);
  av_packet_free(&pPacket);
  avcodec_free_context(&pCodecContext);

  return ret ? SAFE : UNSAFE;
}

int main() {
  printf("[DiscordCrasherCheckerWASM] Copyright (c) 2021 1Lighty, TIMAYCTI License, All Rights Reserved\n");
  return 0;
}

EMSCRIPTEN_BINDINGS(isMalicious)
{
  emscripten::function("isSafe", &isSafe);
}