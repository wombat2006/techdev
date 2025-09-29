"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskType = exports.JAPANESE_EMBEDDING_MODELS = void 0;
exports.JAPANESE_EMBEDDING_MODELS = [
    {
        id: 'tohoku-bert-v3',
        name: 'cl-tohoku/bert-base-japanese-v3',
        description: 'BERT base model for Japanese (v3) - 東北大学',
        modelPath: 'cl-tohoku/bert-base-japanese-v3',
        maxLength: 512,
        dimensions: 768,
        language: 'japanese',
        useCase: 'general'
    },
    {
        id: 'sentence-bert-ja',
        name: 'sonoisa/sentence-bert-base-ja-mean-tokens-v2',
        description: 'Sentence-BERT for Japanese with mean token pooling',
        modelPath: 'sonoisa/sentence-bert-base-ja-mean-tokens-v2',
        maxLength: 512,
        dimensions: 768,
        language: 'japanese',
        useCase: 'sentence'
    },
    {
        id: 'colorful-sbert',
        name: 'colorfulscoop/sbert-base-ja',
        description: 'Sentence-BERT base model for Japanese - ColorfulScoop',
        modelPath: 'colorfulscoop/sbert-base-ja',
        maxLength: 512,
        dimensions: 768,
        language: 'japanese',
        useCase: 'sentence'
    },
    {
        id: 'rinna-roberta',
        name: 'rinna/japanese-roberta-base',
        description: 'RoBERTa base model for Japanese - rinna Co., Ltd.',
        modelPath: 'rinna/japanese-roberta-base',
        maxLength: 512,
        dimensions: 768,
        language: 'japanese',
        useCase: 'general'
    },
    {
        id: 'tohoku-bert-v2',
        name: 'tohoku-nlp/bert-base-japanese-v2',
        description: 'BERT base model for Japanese (v2) - 東北大学NLP研究室',
        modelPath: 'tohoku-nlp/bert-base-japanese-v2',
        maxLength: 512,
        dimensions: 768,
        language: 'japanese',
        useCase: 'general'
    }
];
/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
var TaskType;
(function (TaskType) {
    TaskType["BASIC"] = "basic";
    TaskType["PREMIUM"] = "premium";
    TaskType["CRITICAL"] = "critical";
})(TaskType || (exports.TaskType = TaskType = {}));
//# sourceMappingURL=huggingface.js.map