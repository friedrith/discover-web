#include <stdio.h>
#include <emscripten/emscripten.h>
#include <math.h>

#ifdef __cplusplus
extern "C"
{
#endif

  int EMSCRIPTEN_KEEPALIVE fastPow(int a, int b)
  {
    return pow(a, b);
  }

#ifdef __cplusplus
}
#endif