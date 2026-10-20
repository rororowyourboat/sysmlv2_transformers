package TransformerLibrary {
    private import ScalarValues::*;
    doc /* Logical architecture vocabulary. Tensor shape compatibility,
         * numerical execution and checkpoint parity are separate checks. */
    item def Tensor;
    port def TensorPort { out item value : Tensor; }
    part def Transform {
        port input : ~TensorPort;
        port output : TensorPort;
    }
    part def TokenSource { port output : TensorPort; }
    part def TokenEmbedding :> Transform {
        attribute weightShape : String default = "vocabulary,modelWidth";
    }
    part def PositionEmbedding {
        port output : TensorPort;
        attribute weightShape : String default = "contextLength,modelWidth";
    }
    part def Add {
        port left : ~TensorPort;
        port right : ~TensorPort;
        port output : TensorPort;
    }
    part def Dropout :> Transform;
    part def LayerNorm :> Transform {
        attribute epsilon : Real default = 0.00001;
    }
    part def Affine :> Transform;
    part def AttentionProjection :> Affine {
        attribute weightShape : String default = "modelWidth,modelWidth";
    }
    part def MLPExpand :> Affine {
        attribute weightShape : String default = "mlpWidth,modelWidth";
    }
    part def MLPContract :> Affine {
        attribute weightShape : String default = "modelWidth,mlpWidth";
    }
    part def GELU :> Transform;
    part def QKVProjection {
        port input : ~TensorPort;
        port query : TensorPort;
        port key : TensorPort;
        port value : TensorPort;
        attribute weightShape : String default = "3*modelWidth,modelWidth";
        doc /* Combined learned projection followed by splitting into Q/K/V
             * and reshaping into headCount heads. Logical axes, not values. */
    }
    part def QKProduct {
        port query : ~TensorPort;
        port key : ~TensorPort;
        port output : TensorPort;
        doc /* Q times transposed K, scaled by sqrt(modelWidth/headCount). */
    }
    part def CausalMask :> Transform;
    part def Softmax :> Transform;
    part def WeightedValues {
        port weights : ~TensorPort;
        port values : ~TensorPort;
        port output : TensorPort;
    }
    part def HeadConcat :> Transform;
    part def CausalSelfAttention :> Transform {
        part qkv : QKVProjection;
        part scores : QKProduct;
        part mask : CausalMask;
        part probabilities : Softmax;
        part mix : WeightedValues;
        part concatenate : HeadConcat;
        part projection : AttentionProjection;
        part dropout : Dropout;
        bind input = qkv.input;
        connect qkv.query to scores.query;
        connect qkv.key to scores.key;
        connect scores.output to mask.input;
        connect mask.output to probabilities.input;
        connect probabilities.output to mix.weights;
        connect qkv.value to mix.values;
        connect mix.output to concatenate.input;
        connect concatenate.output to projection.input;
        connect projection.output to dropout.input;
        bind dropout.output = output;
        doc /* These connections specify tensor dependencies. KV caches and
             * fused implementation kernels are outside this logical view. */
    }
    part def FeedForward :> Transform {
        part expand : MLPExpand;
        part activation : GELU;
        part contract : MLPContract;
        part dropout : Dropout;
        bind input = expand.input;
        connect expand.output to activation.input;
        connect activation.output to contract.input;
        connect contract.output to dropout.input;
        bind dropout.output = output;
        doc /* Expansion maps modelWidth to mlpWidth; contraction maps back.
             * The owning model supplies the exact/tanh GELU convention.
             * Shape compatibility is not yet a native evaluated constraint. */
    }
    part def LanguageHead :> Transform {
        attribute weightShape : String default = "vocabulary,modelWidth";
    }
    part def PreNormBlock :> Transform {
        part norm1 : LayerNorm;
        part attention : CausalSelfAttention;
        part residual1 : Add;
        part norm2 : LayerNorm;
        part mlp : FeedForward;
        part residual2 : Add;
        bind input = norm1.input;
        bind input = residual1.left;
        connect norm1.output to attention.input;
        connect attention.output to residual1.right;
        connect residual1.output to norm2.input;
        connect residual1.output to residual2.left;
        connect norm2.output to mlp.input;
        connect mlp.output to residual2.right;
        bind residual2.output = output;
    }
    part def DecoderStack :> Transform {
        attribute depth : Integer default = 12;
        part layers : PreNormBlock[depth] ordered;
        doc /* Ordered repeated decoder blocks. Serial execution of indexed
             * layers is described here, not expanded into individual SysML
             * connections. The viewer shows this as a collapsed stack. */
    }
    part def DecoderOnlyTransformer {
        attribute blockCount : Integer default = 12;
        attribute modelWidth : Integer default = 768;
        attribute headCount : Integer default = 12;
        attribute mlpWidth : Integer default = 3072;
        attribute vocabulary : Integer default = 50257;
        attribute contextLength : Integer default = 1024;
        attribute biases : Boolean default = true;
        attribute dropout : Real default = 0.0;
        attribute activation : String default = "gelu";
        attribute tiedEmbeddings : Boolean default = true;
        part tokens : TokenSource;
        part tokenEmbedding : TokenEmbedding;
        part positionEmbedding : PositionEmbedding;
        part embeddingAdd : Add;
        part embeddingDropout : Dropout;
        part decoder : DecoderStack {
            attribute :>> depth default = blockCount;
        }
        part finalNorm : LayerNorm;
        part lmHead : LanguageHead;
        connect tokens.output to tokenEmbedding.input;
        connect tokenEmbedding.output to embeddingAdd.left;
        connect positionEmbedding.output to embeddingAdd.right;
        connect embeddingAdd.output to embeddingDropout.input;
        connect embeddingDropout.output to decoder.input;
        connect decoder.output to finalNorm.input;
        connect finalNorm.output to lmHead.input;
        doc /* tiedEmbeddings records shared token/output weights, not a tensor
             * data-flow connection. Token and position embeddings are distinct.
             * Model dimensions describe the whole configuration; this library
             * does not yet enforce per-port tensor shapes or width constraints. */
    }
}
