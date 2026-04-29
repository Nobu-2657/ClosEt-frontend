const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// tflite を追加（onnxも残しておいてOKです）
config.resolver.assetExts.push('tflite', 'onnx');

module.exports = config;