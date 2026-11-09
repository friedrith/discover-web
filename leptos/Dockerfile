# --- Build: native server binary + WASM bundle + Tailwind CSS ---
FROM rust:1-bookworm AS builder
RUN rustup target add wasm32-unknown-unknown
# cargo-binstall downloads a prebuilt cargo-leptos instead of compiling it.
RUN curl -L --proto '=https' --tlsv1.2 -sSf \
      https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash \
 && cargo binstall -y cargo-leptos@0.3.11
WORKDIR /app
COPY . .
RUN cargo leptos build --release

# --- Run: only the binary and the static site ---
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/target/release/leptos-fullstack /app/
COPY --from=builder /app/target/site /app/site
COPY --from=builder /app/Cargo.toml /app/
ENV RUST_LOG=info \
    LEPTOS_ENV=PROD \
    LEPTOS_SITE_ROOT=site \
    LEPTOS_SITE_ADDR=0.0.0.0:8080
EXPOSE 8080
CMD ["/app/leptos-fullstack"]
