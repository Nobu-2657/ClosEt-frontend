import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, Button, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Dimensions, Platform, Alert, FlatList, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import config from '../../config'; 
import * as ImagePicker from 'expo-image-picker';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import CustomButton from '../after_register/customButton'; 

import * as ImageManipulator from 'expo-image-manipulator';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { decode as decodeJpeg } from 'jpeg-js';

const { width } = Dimensions.get('window');
const CAMERA_SIZE = width;

interface ClothesData {
    id: string;
    uri: string;
    name: string;
    category: string;
    temperature: number;
}

const IMAGENET_CLOTHES_MAP: { [key: number]: { category: string; temp: number } } = {
    614: { category: 'outerwear', temp: 10 },
    794: { category: 'outerwear', temp: 12 },
    459: { category: 'outerwear', temp: 10 },
    815: { category: 'outerwear', temp: 5 },
    610: { category: 'tops', temp: 25 },
    841: { category: 'pants', temp: 20 },
    620: { category: 'other', temp: 20 },
};

const CameraScreen: React.FC = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    
    const [clothesList, setClothesList] = useState<ClothesData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0); // ★現在表示中の画像のインデックスを管理

    const [tempShotList, setTempShotList] = useState<ClothesData[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const navigation = useNavigation();
    const isFocused = useIsFocused();

    const plugin = useTensorflowModel(require('../../assets/models/mobilenet_v2.tflite'));
    const model = plugin.model;

    const processImage = async (originalUri: string, idSuffix: string): Promise<ClothesData | null> => {
        try {
            const compressedImage = await ImageManipulator.manipulateAsync(
                originalUri,
                [{ resize: { width: 800 } }], 
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const aiInputImage = await ImageManipulator.manipulateAsync(
                compressedImage.uri,
                [{ resize: { width: 224, height: 224 } }],
                { format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );

            if (!aiInputImage.base64) return null;

            const rawBinary = decodeBase64(aiInputImage.base64);
            const { data } = decodeJpeg(rawBinary, { useTArray: true });
            const float32 = new Float32Array(224 * 224 * 3);
            for (let i = 0; i < 224 * 224; i++) {
                float32[i * 3 + 0] = data[i * 4 + 0] / 255.0;
                float32[i * 3 + 1] = data[i * 4 + 1] / 255.0;
                float32[i * 3 + 2] = data[i * 4 + 2] / 255.0;
            }
            const output = await model.run([float32]);
            const prediction = output[0] as Float32Array;
            let maxIndex = 0;
            let maxVal = -Infinity;
            for (let i = 0; i < prediction.length; i++) {
                if (prediction[i] > maxVal) {
                    maxVal = prediction[i];
                    maxIndex = i;
                }
            }
            
            let category = 'other';
            let temp = 20;
            const result = IMAGENET_CLOTHES_MAP[maxIndex];
            if (result) {
                category = result.category;
                temp = result.temp;
            }

            return {
                id: Date.now().toString() + idSuffix,
                uri: compressedImage.uri,
                name: '',
                category: category,
                temperature: temp,
            };

        } catch (e) {
            console.error("画像処理エラー:", e);
            return null;
        }
    };

    useEffect(() => {
        if (isFocused) {
            setClothesList([]);
            setTempShotList([]);
            setCurrentIndex(0);
            setIsUploading(false);
            setIsProcessing(false);
        }
    }, [isFocused]);

    const takePicture = async () => {
        if (cameraRef.current && !isProcessing) {
            setIsProcessing(true);
            try {
                const result = await cameraRef.current.takePictureAsync({ skipProcessing: true });
                if (result && result.uri) {
                    const newItem = await processImage(result.uri, '_cam');
                    if (newItem) setTempShotList(prev => [...prev, newItem]);
                }
            } catch (error) {
                console.error("撮影エラー:", error);
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const selectPicture = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 1,
        });

        if (!result.canceled && result.assets) {
            setIsUploading(true);
            const newItems: ClothesData[] = [];
            await Promise.all(result.assets.map(async (asset, i) => {
                if (!asset.uri) return;
                const newItem = await processImage(asset.uri, `_pick_${i}`);
                if (newItem) newItems.push(newItem);
            }));
            
            setClothesList(prev => [...prev, ...newItems]);
            setCurrentIndex(0); // ギャラリーから追加したら最初に戻る
            setIsUploading(false);
        }
    };

    const finishShooting = () => {
        setClothesList(prev => [...prev, ...tempShotList]);
        setTempShotList([]);
        setCurrentIndex(0);
    };

    const updateClothesData = (id: string, field: keyof ClothesData, value: any) => {
        setClothesList(prev => 
            prev.map(item => item.id === id ? { ...item, [field]: value } : item)
        );
    };

    const uploadAllPhotos = async () => {
        const invalidItem = clothesList.find(c => !c.name.trim() || !c.category);
        if (invalidItem) {
            Alert.alert('エラー', 'すべての服の名称とカテゴリを入力してください');
            return;
        }

        Alert.alert('確認', `${clothesList.length}着の服を収納しますか？`, [
            { text: 'キャンセル' },
            { 
                text: '収納', 
                onPress: async () => {
                    setIsUploading(true);
                    try {
                        const userId = await AsyncStorage.getItem('userId');
                        if (!userId) throw new Error('User ID not found');

                        const uploadPromises = clothesList.map(async (item) => {
                            const formData = new FormData();
                            formData.append('image', {
                                uri: item.uri,
                                type: 'image/jpeg',
                                name: 'photo.jpg',
                            } as any);
                            
                            formData.append('userId', userId);
                            formData.append('name', item.name);
                            formData.append('category', item.category);
                            formData.append('temperature', item.temperature.toString());

                            const response = await fetch(`${config.serverIP}/api/upload`, {
                                method: 'POST',
                                body: formData,
                            });

                            if (!response.ok) throw new Error();
                        });

                        await Promise.all(uploadPromises);
                        Alert.alert('完了', 'すべての服を収納しました！');
                        setClothesList([]);
                        navigation.goBack();

                    } catch (error) {
                        Alert.alert('エラー', '一部の画像のアップロードに失敗しました');
                    } finally {
                        setIsUploading(false);
                    }
                }
            }
        ]);
    };

    const removeClothesData = (id: string) => {
        Alert.alert('確認', 'この写真を削除しますか？', [
            { text: 'キャンセル', style: 'cancel' },
            { 
                text: '削除', 
                style: 'destructive',
                onPress: () => {
                    setClothesList(prev => {
                        const newList = prev.filter(item => item.id !== id);
                        // 消した結果、現在のインデックスが配列サイズを超えたら調整する
                        if (currentIndex >= newList.length) {
                            setCurrentIndex(Math.max(0, newList.length - 1));
                        }
                        return newList;
                    });
                }
            }
        ]);
    };

    // --- UIの描画 ---

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Button onPress={requestPermission} title="カメラの起動を許可" />
            </View>
        );
    }

    if (isUploading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text style={styles.loadingText}>処理中...</Text>
            </View>
        );
    }

    // ★ スワイプ分離型の編集画面
    if (clothesList.length > 0) {
        // 現在画面中央にある服のデータ
        const currentItem = clothesList[currentIndex];

        return (
            <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 40 }}>
                {/* ヘッダー */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerButton} onPress={() => setClothesList([])}>
                        <AntDesign name="left" size={24} color="black" />
                    </TouchableOpacity>
                    <Image source={require('../images/ClosEt_logo.png')} style={styles.headerLogo} />
                    <View style={styles.headerButton} />
                </View>
                
                <View style={styles.divider} />
                <Text style={[styles.countText, { color: 'black' }]}>
                    登録アイテム: {clothesList.length}着 (写真を左右にスワイプ)
                </Text>

                {/* 上部：画像だけの横スワイプエリア */}
                <View style={{ height: CAMERA_SIZE * 0.9 }}>
                    <FlatList
                        data={clothesList}
                        keyExtractor={(item) => item.id}
                        horizontal={true}
                        pagingEnabled={true}
                        showsHorizontalScrollIndicator={false}
                        // スワイプがピタッと止まった時に呼ばれる
                        onMomentumScrollEnd={(event) => {
                            const index = Math.round(event.nativeEvent.contentOffset.x / width);
                            setCurrentIndex(index);
                        }}
                        renderItem={({ item, index }) => (
                            <View style={{ width: width, alignItems: 'center', paddingTop: 10 }}>
                                <TouchableOpacity 
                                    style={styles.deleteCardButton} 
                                    onPress={() => removeClothesData(item.id)}
                                >
                                    <Ionicons name="trash-outline" size={26} color="red" />
                                </TouchableOpacity>
                                <Text style={[styles.cardNumber, { color: 'black' }]}>
                                    {index + 1} / {clothesList.length}
                                </Text>
                                <Image source={{ uri: item.uri }} style={styles.preview} />
                            </View>
                        )}
                    />
                </View>

                {/* 下部：現在の画像の編集エリア（横スワイプしないのでスライダーが干渉しない） */}
                {currentItem && (
                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 10 }}>
                        
                        <View style={[styles.inputContainer, { width: '80%' }]}>
                            <TextInput 
                                style={[styles.input, { color: 'black' }]} 
                                placeholder="服の名称" 
                                placeholderTextColor="#888888" 
                                value={currentItem.name} 
                                onChangeText={(text) => updateClothesData(currentItem.id, 'name', text)} 
                            />
                        </View>

                        <Text style={styles.label}>{currentItem.temperature}℃</Text>
                        
                        <View style={styles.sliderContainer}>
                            <Ionicons name="snow-outline" size={24} color="black" />
                            <Slider 
                                style={styles.slider} 
                                minimumValue={-10} maximumValue={40} step={1} 
                                value={currentItem.temperature} 
                                // 動かしている最中も数字が変わり、かつサクサク動きます
                                onValueChange={(val) => updateClothesData(currentItem.id, 'temperature', val)} 
                                thumbTintColor="white" 
                                minimumTrackTintColor="black" 
                                maximumTrackTintColor="#BFBFBF" 
                            />
                            <Ionicons name="sunny-outline" size={24} color="black" />
                        </View>

                        <View style={styles.pickerContainer}>
                            {/* mode="dropdown" を削除し、以前の仕様に戻しました */}
                            <Picker 
                                selectedValue={currentItem.category} 
                                style={[styles.picker, { color: 'black' }]} 
                                onValueChange={(val) => updateClothesData(currentItem.id, 'category', val)}
                                dropdownIconColor="black"
                            >
                                <Picker.Item label="カテゴリを選択" value="" color="#888888" />
                                <Picker.Item label="ジャケット/アウター" value="outerwear" color="black" />
                                <Picker.Item label="トップス" value="tops" color="black" />
                                <Picker.Item label="パンツ" value="pants" color="black" />
                                <Picker.Item label="スカート" value="skirt" color="black" />
                                <Picker.Item label="ワンピース/ドレス" value="onepiece" color="black" />
                                <Picker.Item label="その他" value="other" color="black" />
                            </Picker>
                        </View>

                    </ScrollView>
                )}

                <View style={styles.footerButtonContainer}>
                    <CustomButton title="すべて一括で収納" onPress={uploadAllPhotos} />
                </View>
            </View>
        );
    }

    // カメラ撮影画面
    return (
        <View style={styles.cameraContainer}>
            <TouchableOpacity style={styles.cameraBackButton} onPress={() => navigation.goBack()}>
                <AntDesign name="left" size={24} color="white" />
            </TouchableOpacity>
            <CameraView style={styles.camera} ref={cameraRef} />
            
            {tempShotList.length > 0 && (
                <TouchableOpacity style={styles.finishShootingButton} onPress={finishShooting}>
                    <Image source={{ uri: tempShotList[tempShotList.length - 1].uri }} style={styles.thumbnail} />
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{tempShotList.length}</Text>
                    </View>
                </TouchableOpacity>
            )}

            <View style={styles.captureButtonContainer}>
                <TouchableOpacity 
                    style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]} 
                    onPress={takePicture}
                    disabled={isProcessing}
                />
            </View>
            <View style={styles.uploadButtonContainer}>
                <TouchableOpacity style={styles.uploadButton} onPress={selectPicture}>
                    <Ionicons name="images-outline" size={30} color="black" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    camera: { width: CAMERA_SIZE * 0.95, height: CAMERA_SIZE * 0.95 },
    container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'white' },
    cameraContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
    loadingText: { marginTop: 10, fontSize: 16, color: 'gray' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingBottom: 10 },
    headerButton: { width: 40, alignItems: 'center' },
    headerLogo: { width: 100, height: 40, resizeMode: 'contain' },
    divider: { borderBottomColor: '#ccc', borderBottomWidth: 1, width: '100%', marginBottom: 10 },
    countText: { textAlign: 'center', fontSize: 14, marginBottom: 10 },
    
    cardNumber: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    input: { flex: 1, height: 45, borderBottomWidth: 1, borderColor: '#ccc', textAlign: 'center', fontSize: 18 },
    preview: { width: CAMERA_SIZE * 0.8, height: CAMERA_SIZE * 0.8, borderRadius: 15, marginBottom: 10 },
    label: { fontSize: 16, marginTop: 5, },
    sliderContainer: { flexDirection: 'row', alignItems: 'center', width: '85%', marginVertical: 10 },
    slider: { flex: 1, marginHorizontal: 10 },
    pickerContainer: { width: '80%', borderWidth: 1, borderColor: '#ccc', borderRadius: 10, marginBottom: 15, overflow: 'hidden' },
    picker: { width: '100%' },
    footerButtonContainer: { width: '100%', alignItems: 'center', padding: 15, paddingBottom: 35, backgroundColor: 'white', borderTopWidth: 1, borderColor: '#eee' },
    cameraBackButton: { position: 'absolute', top: 50, left: 25, zIndex: 10 },
    captureButtonContainer: { position: 'absolute', bottom: 60 },
    captureButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', borderWidth: 6, borderColor: 'rgba(255,255,255,0.3)' },
    captureButtonDisabled: { opacity: 0.5 },
    uploadButtonContainer: { position: 'absolute', bottom: 65, right: 50 },
    uploadButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center' },
    deleteCardButton: { position: 'absolute', top: 0, right: 30, padding: 10, zIndex: 10},

    finishShootingButton: { position: 'absolute', bottom: 65, left: 50, width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
    thumbnail: { width: 56, height: 56, borderRadius: 10, borderWidth: 2, borderColor: 'white' },
    badge: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
});

export default CameraScreen;