package NanoGPTModels {
    private import ScalarValues::*;
    private import TransformerLibrary::*;
    part def NanoGPTDefault :> DecoderOnlyTransformer {
        doc /* Defaults of the GPTConfig dataclass in karpathy/nanoGPT/model.py,
             * not train.py overrides and not a particular trained model.
             * PyTorch nn.GELU uses its default exact formulation here. */
        attribute :>> blockCount default = 12;
        attribute :>> modelWidth default = 768;
        attribute :>> headCount default = 12;
        attribute :>> mlpWidth default = 3072;
        attribute :>> vocabulary default = 50304;
        attribute :>> contextLength default = 1024;
        attribute :>> biases default = true;
        attribute :>> dropout default = 0.0;
        attribute :>> activation default = "gelu-exact";
        attribute :>> tiedEmbeddings default = true;
    }
    part def NanoGPTTiny :> NanoGPTDefault {
        doc /* Project-authored teaching configuration of the same architecture.
             * These are our chosen dimensions, not an upstream model release. */
        attribute :>> blockCount default = 4;
        attribute :>> modelWidth default = 128;
        attribute :>> headCount default = 4;
        attribute :>> mlpWidth default = 512;
        attribute :>> vocabulary default = 256;
        attribute :>> contextLength default = 128;
    }
}
