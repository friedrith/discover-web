# Benchmark

## Getting started

```bash
$ emcc -o benchmark.html fast-pow.c -O3 -s WASM=1 --shell-file template.html -s NO_EXIT_RUNTIME=1  -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]'
$ emrun --no_browser --port 8080 .
```
