# Use function

## Getting started

```bash
$ emcc -o use-function.html fast-function.c -O3 -s WASM=1 --shell-file template.html -s NO_EXIT_RUNTIME=1  -s EXTRA_EXPORTED_RUNTIME_METHODS='["ccall"]'
$ emrun --no_browser --port 8080 .
```
