#include <stdio.h>
#include <emscripten/emscripten.h>

#ifdef __cplusplus
extern "C"
{
#endif

  int EMSCRIPTEN_KEEPALIVE sum(int a, int b)
  {
    return a + b;
  }

#ifdef __cplusplus
}
#endif