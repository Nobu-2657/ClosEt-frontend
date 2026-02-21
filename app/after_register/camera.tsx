import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Dimensions, Platform, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import config from '@/config';
import * as ImagePicker from 'expo-image-picker';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import CustomButton from '../after_register/customButton';

const { width } = Dimensions.get('window');
const CAMERA_SIZE = width;

const CameraScreen: React.FC = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const [camera, setCamera] = useState<CameraView | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [clothesName, setClothesName] = useState('');
    const [category, setCategory] = useState('');
    const [temperature, setTemperature] = useState(20);
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            setPhoto(null);
            setClothesName('');
            setCategory('');
            setTemperature(20);
        }
    }, [isFocused]);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Button onPress={requestPermission} title="カメラの起動を許可" />
            </View>
        );
    }

    // const takePicture = async () => {
    //     if (camera) {
    //         const photo = await camera.takePictureAsync({ base64: true });
    //         if (photo && photo.base64) {
    //             setPhoto(photo.base64);
    //         }
    //     }
    // };

    // ★修正1: 撮影時はuriを保存
    const takePicture = async () => {
        if (camera) {
            const result = await camera.takePictureAsync();
            if (result && result.uri) {
                setPhoto(result.uri);
            }
        }
    };

    // const selectPicture = async () => {
    //     const result = await ImagePicker.launchImageLibraryAsync({
    //         mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //         allowsEditing: true,
    //         aspect: [1, 1],
    //         quality: 1,
    //         base64: true,
    //     });
    //     if (!result.canceled && result.assets[0].base64) {
    //         setPhoto(result.assets[0].base64);
    //     }
    // };

    // ★修正2: アルバム選択時もuriを保存
    const selectPicture = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        if (!result.canceled && result.assets[0].uri) {
            setPhoto(result.assets[0].uri);
        }
    };

    const uploadPhoto = async () => {
        if (!clothesName.trim()) {
            Alert.alert('エラー', '服の名前を入力してください');
            return;
        }

        if (!category) {
            Alert.alert('エラー', 'カテゴリを選択してください');
            return;
        }

        if (photo) {
            try {
                const userId = await AsyncStorage.getItem('userId');
                if (!userId) throw new Error('User ID not found');

                const formData = new FormData();
                // ★修正3: URIを使ってFormDataを作成
                formData.append('image', {
                    uri: photo, // ←ここがファイルパス(file://...)になる
                    type: 'image/jpeg',
                    name: 'photo.jpg',
                } as any);
                
                formData.append('userId', userId);
                formData.append('name', clothesName);
                formData.append('category', category);
                formData.append('temperature', temperature.toString());

                // URLは合っているのでそのまま
                const response = await fetch(`http://${config.serverIP}:3000/api/upload`, {
                    method: 'POST',
                    body: formData,
                    // ★重要: multipart/form-dataの場合、Content-Typeヘッダーは
                    // 明示的に書かない方が良い場合もありますが、
                    // React Nativeのfetchは書かなくてもboundaryを自動付与してくれます。
                    // もしエラーになるようなら headers を削除してみてください。
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('Server response:', errorData);
                    throw new Error(`Upload failed: ${errorData}`);
                }

                const data = await response.json();
                navigation.goBack();
            } catch (error) {
                console.error('Error uploading photo:', error);
                Alert.alert('エラー', '画像のアップロードに失敗しました');
            }
        }
    };

    if (photo) {
        return (
            <ScrollView>
                <View style={styles.logoContainer}>
                    <Image source={require('../images/ClosEt_logo.png')} style={styles.logo} />
                </View>
                <View style={styles.divider} />
                <View style={styles.container}>
                    <View style={styles.inputContainer}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => setPhoto(null)}
                        >
                            <AntDesign name="left" size={24} color="black" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            placeholder="名称"
                            value={clothesName}
                            onChangeText={setClothesName}
                        />
                    </View>
                    {photo && (
                        <Image source={{ uri: photo }} style={styles.preview} />
                    )}
                    <Text style={styles.label}>{temperature}℃</Text>
                    <View style={styles.sliderContainer}>
                    <Ionicons name="snow-outline" size={24} color="black" />
                    <Slider
                        style={styles.slider}
                        minimumValue={-10}
                        maximumValue={40}
                        step={1}
                        value={temperature}
                        onValueChange={setTemperature}
                        thumbTintColor="white"
                        minimumTrackTintColor="black"
                        maximumTrackTintColor="#BFBFBF"
                    />
                    <Ionicons name="sunny-outline" size={24} color="black" />
                    </View>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={category}
                            style={styles.picker}
                            onValueChange={(itemValue: React.SetStateAction<string>) => setCategory(itemValue)}
                        >
                            <Picker.Item label="カテゴリ" value="" />
                            <Picker.Item label="ジャケット/アウター" value="outerwear" />
                            <Picker.Item label="トップス" value="tops" />
                            <Picker.Item label="パンツ" value="pants" />
                            <Picker.Item label="スカート" value="skirt" />
                            <Picker.Item label="ワンピース/ドレス" value="onepiece" />
                            <Picker.Item label="その他" value="other" />
                        </Picker>
                    </View>
                    <View style={[styles.buttonContainer, { width: '50%' }]}>
                        <CustomButton
                            title="収納"
                            onPress={uploadPhoto}
                        />
                    </View>
                </View>
            </ScrollView>
        );
    }

    return (
        <View style={styles.cameraContainer}>
            {isFocused && (
                <>
                    <TouchableOpacity
                        style={styles.cameraBackButton}
                        onPress={() => navigation.goBack()}
                    >
                        <AntDesign name="left" size={24} color="white" />
                    </TouchableOpacity>
                    <CameraView
                        style={styles.camera}
                        ref={(ref) => setCamera(ref)}
                    />
                    <View style={styles.captureButtonContainer}>
                        <TouchableOpacity style={styles.captureButton} onPress={takePicture} />
                    </View>
                    <View style={styles.uploadButtonContainer}>
                        <TouchableOpacity style={styles.uploadButton} onPress={selectPicture}>
                            <Ionicons name="images-outline" size={30} color="black" />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    camera: {
        width: CAMERA_SIZE*0.95,
        height: CAMERA_SIZE*0.95,
    },
    container: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    cameraContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'black',
    },
    logoContainer: {
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
    },
    logo: {
        width: 100,
        height: 50,
    },
    divider: {
        borderBottomColor: '#ccc',
        borderBottomWidth: 1,
        marginBottom: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
        width: '100%',
    },
    cameraBackButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
    },
    backButton: {
        position: 'absolute',
        left: 10,
        zIndex: 1,
        height: '100%',
        justifyContent: 'center',
        width: 40,
    },
    input: {
        flex: 1,
        height: 40,
        paddingLeft: 50,
        paddingRight: 10,
        textAlign: 'center',
        marginRight: 40,
    },
    preview: {
        aspectRatio: 1,
        width: '100%',
        height: undefined,
        alignSelf: 'center',
    },
    label: {
        fontSize: 16,
        marginTop: 5,
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        marginBottom: 20,
    },
    slider: {
        flex: 1,
        marginHorizontal: 10,
    },
    pickerContainer: {
        ...Platform.select({
            ios: {
                width: '60%',
                marginBottom: 20,
            },
            android: {
                width: '60%',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: 'gray',
                borderRadius: 10,
                overflow: 'hidden',
            },
        }),
    },
    picker: {
        ...Platform.select({
            ios: {
                width: '100%',
            },
            android: {
                width: '100%',
            },
        }),
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    button: {
        backgroundColor: 'blue',
        padding: 15,
        borderRadius: 5,
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
    },
    captureButtonContainer: {
        position: 'absolute',
        bottom: 70,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'white',
        borderWidth: 5,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    uploadButtonContainer:{
        position: 'absolute',
        bottom: 70,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        right: '15%',
    },
    uploadButton: {
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 35,
    },
});

export default CameraScreen;