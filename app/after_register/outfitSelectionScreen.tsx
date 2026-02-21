import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal, Dimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker } from 'react-native-maps';
import { AntDesign, Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CustomButton from './customButton';
import config from '@/config';
import { useNavigation } from '@react-navigation/native';

const OPENWEATHERMAP_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHERMAP_API_KEY; //APIキー

const { width, height } = Dimensions.get('window');
const BASE_URL = `https://api.openweathermap.org/data/2.5/weather`;

type ClothingItem = {
    id: string;
    base64: string;
    name: string;
    category: string;
    temperature: number;
    createdAt: string;
    imageUrl?: string;
};

const categoryMap: { [key: string]: string } = {
    'outerwear': 'ジャケット/アウター',
    'tops': 'トップス',
    'pants': 'パンツ',
    'skirt': 'スカート',
    'onepiece': 'ワンピース/ドレス',
    'other': 'その他'
};

const categoryOrder: { [key: string]: number } = {
    'outerwear': 1,
    'tops': 2,
    'pants': 3,
    'skirt': 4,
    'onepiece': 5,
    'other': 6
};

const OutfitSelectionScreen = () => {
    const [clothes, setClothes] = useState<ClothingItem[]>([]);
    const [filteredClothes, setFilteredClothes] = useState<ClothingItem[]>([]);
    const [temperature, setTemperature] = useState<number | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [mapRegion, setMapRegion] = useState({
        latitude: 35.681236,
        longitude: 139.767125,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    const [selectedOutfit, setSelectedOutfit] = useState<{ id: string; order: number }[]>([]);
    const navigation = useNavigation();
    const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
    const [centerCoordinate, setCenterCoordinate] = useState({
        latitude: 35.681236,
        longitude: 139.767125
    });
    const [showFloatingMessage, setShowFloatingMessage] = useState(false);
    const [greetingIcon, setGreetingIcon] = useState("human-greeting");

    useEffect(() => {
        const fetchData = async () => {
            await fetchClothes();
            const currentTemp = await AsyncStorage.getItem('currentTemperature');
            if (currentTemp) {
                setTemperature(Number(currentTemp));
            }
        };
        fetchData();
    }, []);

    const fetchClothes = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            const response = await fetch(`${config.serverIP}/api/images?userId=${userId}`);
            if (!response.ok) throw new Error('衣類の取得に失敗しました');
            const data = await response.json();
            setClothes(data);
        } catch (error) {
            console.error('衣類の取得エラー:', error);
        }
    };

    useEffect(() => {
        if (clothes.length > 0 && temperature !== null) {
            const filtered = clothes.filter(item =>
                item.temperature != null &&
                Math.abs(item.temperature - temperature) <= 5
            );
            setFilteredClothes(filtered);
        }
    }, [clothes, temperature]);

    const toggleClothingSelection = (item: ClothingItem) => {
        setSelectedOutfit(prev => {
            const index = prev.findIndex(selected => selected.id === item.id);
            if (index > -1) {
                return prev.filter(selected => selected.id !== item.id);
            } else {
                return [...prev, { id: item.id, order: prev.length + 1 }];
            }
        });
    };

    const registerOutfit = async () => {
        if (selectedOutfit.length === 0) {
            Alert.alert(
                "エラー",
                "え？裸で行くの？w",
                [{ text: "OK" }]
            );
            return;
        }

        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                throw new Error('ユーザーIDが見つかりません');
            }

            const today = new Date().toISOString().split('T')[0];

            const checkResponse = await fetch(`${config.serverIP}/api/check-outfit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    date: today
                }),
            });
            
            const responseText = await checkResponse.text();

            if (!checkResponse.ok) {
                throw new Error(`データの確認に失敗しました: ${responseText}`);
            }

            const { exists, outfitId } = JSON.parse(responseText);

            if (exists) {
                await updateOutfit(userId, outfitId);
            } else {
                const createNewOutfit = async (userId: string) => {
                    try {
                        const response = await fetch(`${config.serverIP}/api/register-outfit`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                date: new Date().toISOString(),
                                clothesIds: selectedOutfit.map(item => item.id)
                            }),
                        });

                        if (!response.ok) throw new Error('服の登録に失敗しました');

                        showSuccessMessage();
                    } catch (error) {
                        console.error('新規登録エラー:', error);
                    }
                };
                await createNewOutfit(userId);
            }
        } catch (error) {
            console.error('服の登録エラー:', error);
            if (error instanceof Error) {
                console.error('エラーの詳細:', {
                    message: error.message,
                    stack: error.stack
                });
            } else {
                console.error('不明なエラー:', error);
            }
        }
    };

    // 更新用の関数
    const updateOutfit = async (userId: string, outfitId: string) => {
        try {
            const response = await fetch(`${config.serverIP}/api/update-outfit/${outfitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    date: new Date().toISOString(),
                    clothesIds: selectedOutfit.map(item => item.id)
                }),
            });

            if (!response.ok) throw new Error('服の更新に失敗しました');

            showSuccessMessage();
        } catch (error) {
            console.error('更新エラー:', error);
        }
    };

    // 成功メッセージの表示と画面遷移
    const showSuccessMessage = () => {
        setShowFloatingMessage(true);
        setTimeout(() => {
            setShowFloatingMessage(false);
            navigation.goBack();
        }, 2000);
    };

    const getImageSource = useCallback((item: ClothingItem) => {
        if (imageUrls[item.id]) {
            return { uri: imageUrls[item.id] };
        }

        if (item.imageUrl) {
            const fullUrl = item.imageUrl.startsWith('http') 
                ? item.imageUrl 
                : `${config.serverIP}${item.imageUrl}`;
            
            useEffect(() => {
                setImageUrls(prev => ({
                    ...prev,
                    [item.id]: fullUrl
                }));
            }, [item.id, fullUrl]);

            return { uri: fullUrl };
        } else if (item.base64) {
            return { uri: `data:image/jpeg;base64,${item.base64}` };
        }
        return require('../images/default-image.png');
    }, [imageUrls]);

    const clearImageUrlCache = useCallback(() => {
        setImageUrls({});
    }, []);

    useEffect(() => {
        if (clothes.length > 0) {
            const newImageUrls: { [key: string]: string } = {};
            clothes.forEach(item => {
                if (item.imageUrl) {
                    const fullUrl = item.imageUrl.startsWith('http')
                        ? item.imageUrl
                        : `${config.serverIP}${item.imageUrl}`;
                    newImageUrls[item.id] = fullUrl;
                }
            });
            setImageUrls(newImageUrls);
        }
    }, [clothes]);

    const closeModal = () => {
        setShowLocationModal(false);
        clearImageUrlCache();
    };

    const renderItem = ({ item }: { item: ClothingItem }) => {
        const isSelected = selectedOutfit.some(selected => selected.id === item.id);

        return (
            <TouchableOpacity onPress={() => toggleClothingSelection(item)} style={styles.itemContainer}>
                <Image
                    source={getImageSource(item)}
                    style={[styles.image, isSelected && styles.selectedImage]}
                />
                {isSelected && (
                    <View style={styles.selectionOrderBadge}>
                        <Ionicons name="checkmark-circle" size={40} color="white" style={styles.checkmarkIcon} />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderCategory = ({ item }: { item: string }) => {
        const clothesInTemperatureRange = filteredClothes.filter(cloth =>
            cloth.category === item &&
            cloth.temperature != null &&
            temperature != null &&
            Math.abs(cloth.temperature - temperature) <= 5
        );

        if (clothesInTemperatureRange.length === 0) {
            return null;
        }

        return (
            <View>
                <Text style={styles.categoryTitle}>{categoryMap[item] || item}</Text>
                <FlatList
                    data={clothesInTemperatureRange}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    horizontal={true}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.imageList}
                />
            </View>
        );
    };

    // カテゴリを取得し、指定された順序でソート
    const categories = [...new Set(filteredClothes.map(item => item.category))]
        .sort((a, b) => (categoryOrder[a] || Number.MAX_SAFE_INTEGER) - (categoryOrder[b] || Number.MAX_SAFE_INTEGER));

    const fetchTemperature = async (lat: number, lon: number) => {
        try {
            console.log('Fetching temperature for:', lat, lon);
            const response = await fetch(
                `${BASE_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`
            );
            
            if (!response.ok) {
                throw new Error('気温の取得に失敗しました');
            }
            
            const data = await response.json();
            console.log('Weather API response:', data);
            
            // OpenWeatherMap APIのレスポンスから気温を取得
            const temp = data.main.temp; // ここを修正
            console.log('Retrieved temperature:', temp);
            
            return temp;
        } catch (error) {
            console.error('気温取得エラー:', error);
            return null;
        }
    };

    const handleLocationSelect = async () => {
        console.log('handleLocationSelect');
        // モーダルを閉じる前にキャッシュをクリア
        //clearImageUrlCache();
        setShowLocationModal(false);
        if (selectedLocation) {
            const temp = await fetchTemperature(selectedLocation.lat, selectedLocation.lon);
            if (temp !== null) {
                setTemperature(temp);
                await AsyncStorage.setItem('currentTemperature', temp.toString());
                console.log('temp',temp);
                // 選択された気温に基づいて衣類をフィルタリング
                const filtered = clothes.filter(item =>
                    item.temperature != null &&
                    Math.abs(item.temperature - temp) <= 5
                );
                setFilteredClothes(filtered);
            }
        }
        // モーダルを閉じる前にキャッシュをクリア
        // clearImageUrlCache();
        // setShowLocationModal(false);
    };

    const resetMapAndLocation = () => {
        setSelectedLocation(null);
        setMapRegion({
            latitude: 35.681236,
            longitude: 139.767125,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        });
    };

    const onRegionChangeComplete = (region: any) => {
        setMapRegion(region);
        // 地図の中心座標を更新
        setCenterCoordinate({
            latitude: region.latitude,
            longitude: region.longitude
        });
        // 選択位置を更新
        setSelectedLocation({
            lat: region.latitude,
            lon: region.longitude
        });
    };

    useEffect(() => {
        if (showFloatingMessage) {
            const interval = setInterval(() => {
                setGreetingIcon(prev => 
                    prev === "human-greeting" ? "human-handsdown" : "human-greeting"
                );
            }, 500); // 0.5秒ごとに切り替え

            // 2回切り替えた後に停止
            setTimeout(() => {
                clearInterval(interval);
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [showFloatingMessage]);

    return (
        <>
            <View style={styles.logoContainer}>
                <Image source={require('../images/ClosEt_logo.png')} style={styles.logo} />
            </View>
            <View style={styles.divider} />
            <View style={styles.container}>
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <AntDesign name="left" size={24} color="black" />
                    </TouchableOpacity>
                    
                    <Text style={styles.screenTitle}>服を選択</Text>
                    
                    <View style={styles.temperatureContainer}>
                        {temperature !== null && (
                            <Text style={styles.temperatureText}>
                                {Math.round(temperature)}℃
                            </Text>
                        )}
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.mapButton}
                        onPress={() => {
                            resetMapAndLocation();
                            setShowLocationModal(true);
                        }}
                    >
                        <Entypo name="location" size={24} color="black" />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={categories}
                    renderItem={renderCategory}
                    keyExtractor={(item) => item}
                    contentContainerStyle={styles.clothesList}
                />
                <View style={styles.centerButtonContainer}>
                    <CustomButton title="おでかけ" onPress={registerOutfit} />
                </View>
            </View>

            {/* 地図モーダルのコンポーネント */}
            <Modal
                visible={showLocationModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => {
                    clearImageUrlCache();
                    setShowLocationModal(false);
                }}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay} 
                    activeOpacity={1} 
                    onPress={() => {
                        resetMapAndLocation();
                        setShowLocationModal(false);
                    }}
                >
                    <View 
                        style={styles.modalContainer}
                        onStartShouldSetResponder={() => true}
                        onTouchEnd={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                style={styles.modalBackButton}
                                onPress={() => {
                                    resetMapAndLocation();
                                    setShowLocationModal(false);
                                }}
                            >
                                <AntDesign name="left" size={24} color="black" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>行き先を選択</Text>
                        </View>
                        <View style={styles.mapContainer}>
                            <MapView
                                style={styles.map}
                                region={mapRegion}
                                onRegionChangeComplete={onRegionChangeComplete}
                            />
                            <View style={styles.centerMarker}>
                                <Entypo name="location-pin" size={40} color="red" />
                            </View>
                        </View>
                        <View style={[styles.buttonContainer, { width: '50%' }]}>
                            <CustomButton title="決定" onPress={handleLocationSelect} />
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
            {showFloatingMessage && (
                <View style={styles.floatingMessageContainer}>
                    <View style={styles.speechBubble}>
                        <Text style={styles.floatingMessageText}>いってらっしゃい！</Text>
                        <View style={styles.speechBubbleTriangle} />
                    </View>
                    <MaterialCommunityIcons 
                        name={greetingIcon} 
                        size={60} 
                        color="black" 
                        style={styles.greetingIcon}
                    />
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    backButton: {
        marginRight: 10,
    },
    mapButton: {
        marginRight: 10,
    },
    centerButtonContainer:{
        justifyContent:'center',
        alignItems:'center',
        marginTop: 20,
        width: '60%',
        marginLeft: 70, 
    },
    modalOverlay: {
        flex: 1,
        justifyContent:'center',
        alignItems:'center',
        backgroundColor:'rgba(0,0,0,0.5)',
    },
    modalContainer:{
        width: 350,
        height: 450,
        backgroundColor: 'white',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalContent: {
        width: '90%',
        height: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
    },
    mapContainer: {
        width: 300,
        height: 300,
        position: 'relative',
        marginTop: 50,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    clothesList: {
        paddingBottom: 20,
    },
    itemContainer: {
        width: 100,
        height: 100,
        marginRight: 10,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 5,
    },
    selectedImage: {
        opacity: 0.7,
    },
    selectionOrderBadge: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -20 }, { translateY: -20 }],
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkmarkIcon: {
        opacity: 0.9
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    imageList:{
        paddingHorizontal :10
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    centerMarker: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -20,
        marginTop: -40,
        zIndex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 1,
    },
    modalTitle: {
        fontSize: 18,
        marginLeft: 10,
    },
    modalBackButton: {
        padding: 10,
    },
    temperatureContainer: {
        flex: 1,
        alignItems: 'flex-end',
        marginRight: 10,
    },
    temperatureText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    floatingMessageContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    floatingMessageText: {
        color: 'black',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    speechBubble: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 15,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#000',
    },
    speechBubbleTriangle: {
        position: 'absolute',
        bottom: -10,
        left: '50%',
        marginLeft: -10,
        width: 0,
        height: 0,
        borderLeftWidth: 10,
        borderRightWidth: 10,
        borderTopWidth: 10,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#000',
    },
    greetingIcon: {
        marginTop: 10,
        marginLeft: 90,
    },
    screenTitle: {
        fontSize: 18,
        marginLeft: 10,
    },
});

export default OutfitSelectionScreen;
