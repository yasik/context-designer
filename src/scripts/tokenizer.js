const loaders = new Map();
const encodings = {
  o200k_base: () => import("gpt-tokenizer/encoding/o200k_base"),
  cl100k_base: () => import("gpt-tokenizer/encoding/cl100k_base"),
};

export function loadLibrary(name) {
  if (!encodings[name])
    return Promise.reject(new Error("Unsupported tokenizer"));
  if (!loaders.has(name)) {
    loaders.set(
      name,
      encodings[name]().catch((error) => {
        loaders.delete(name);
        throw error;
      }),
    );
  }
  return loaders.get(name);
}
