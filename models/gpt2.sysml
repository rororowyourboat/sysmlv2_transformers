package GPT2Models {
    private import ScalarValues::*;
    private import TransformerLibrary::*;
    part def GPT2Small :> DecoderOnlyTransformer {
        doc /* GPT-2 Small logical decoder architecture. Configuration from
             * openai-community/gpt2; computation checked against OpenAI's
             * original src/model.py. This is not a loaded checkpoint. */
        attribute :>> blockCount default = 12;
        attribute :>> modelWidth default = 768;
        attribute :>> headCount default = 12;
        attribute :>> mlpWidth default = 3072;
        attribute :>> vocabulary default = 50257;
        attribute :>> contextLength default = 1024;
        attribute :>> biases default = true;
        attribute :>> dropout default = 0.1;
        attribute :>> activation default = "gelu-tanh-approximation";
        attribute :>> tiedEmbeddings default = true;
    }
}
