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

bool isSafeInternal(AVFormatContext* pFormatContext, AVPacket* pPacket, int videoStreamIDX) {
  int64_t pDTS = -1;
  int64_t pDTSDelta = -1;

  int frame_count = -1;
  if (strcmp(pFormatContext->iformat->name, "matroska,webm")) {
    while (av_read_frame(pFormatContext, pPacket) >= 0) {
      if (pPacket->stream_index == videoStreamIDX) {
        frame_count++;
        if (frame_count >= 200) break;
        auto dts = pPacket->dts;
        if (dts <= 0) continue;
        if (pDTS == -1) pDTS = dts;
        else {
          auto delta = dts - pDTS;
          pDTS = dts;
          if (pDTSDelta == -1) {
            pDTSDelta = delta;
            continue;
          }
          if (pDTSDelta == delta) continue;
          //fprintf(stderr, "Frame %i has a delta anomaly of %lli (%lli - %lli)\n", frame_count, abs(pDTSDelta - delta), pDTSDelta, delta);
          return false;
        }
      }
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

  auto ret = isSafeInternal(pFormatContext, pPacket, videoStreamIDX);

  avformat_close_input(&pFormatContext);
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