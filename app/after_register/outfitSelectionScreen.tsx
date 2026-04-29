import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal, Dimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { AntDesign, Entypo, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import CustomButton from './customButton';
import config from '@/config';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

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
    'outerwear': 1, 'tops': 2, 'pants': 3, 'skirt': 4, 'onepiece': 5, 'other': 6
};

const OutfitSelectionScreen = () => {
    const [clothes, setClothes] = useState<ClothingItem[]>([]);
    const [filteredClothes, setFilteredClothes] = useState<ClothingItem[]>([]);
    
    const [temperature, setTemperature] = useState<number | null>(null);
    const [hourlyTemps, setHourlyTemps] = useState<number[]>([]);
    const [tempRange, setTempRange] = useState<{min: number, max: number, avg: number} | null>(null);
    
    const [startTime, setStartTime] = useState<number>(new Date().getHours());
    const [endTime, setEndTime] = useState<number>((new Date().getHours() + 4) % 24);

    const [showLocationModal, setShowLocationModal] = useState(false);
    
    // ★ 追加：地図をドラッグ中の「仮の座標」と、「決定した座標」を分ける
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [confirmedLocation, setConfirmedLocation] = useState<{ lat: number; lon: number } | null>(null);
    
    const [initialLocation, setInitialLocation] = useState({ latitude: 35.681236, longitude: 139.767125 });
    const [mapRegion, setMapRegion] = useState({
        latitude: 35.681236, longitude: 139.767125, latitudeDelta: 0.0922, longitudeDelta: 0.0421,
    });
    const [centerCoordinate, setCenterCoordinate] = useState({ latitude: 35.681236, longitude: 139.767125 });

    const [selectedOutfit, setSelectedOutfit] = useState<{ id: string; order: number }[]>([]);
    const navigation = useNavigation();
    const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
    const [showFloatingMessage, setShowFloatingMessage] = useState(false);
    const [greetingIcon, setGreetingIcon] = useState("human-greeting");

    useEffect(() => {
        const fetchInitialData = async () => {
            await fetchClothes();
            try {
                const cachedLat = await AsyncStorage.getItem('cachedLat');
                const cachedLon = await AsyncStorage.getItem('cachedLon');
                let lat = cachedLat ? parseFloat(cachedLat) : 35.681236;
                let lon = cachedLon ? parseFloat(cachedLon) : 139.767125;

                setInitialLocation({ latitude: lat, longitude: lon });
                setMapRegion(prev => ({ ...prev, latitude: lat, longitude: lon }));

                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let location = await Location.getLastKnownPositionAsync({});
                    if (!location) {
                        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    }

                    if (location) {
                        lat = location.coords.latitude;
                        lon = location.coords.longitude;
                        
                        setInitialLocation({ latitude: lat, longitude: lon });
                        setMapRegion(prev => ({ ...prev, latitude: lat, longitude: lon }));
                        setCenterCoordinate({ latitude: lat, longitude: lon });

                        await AsyncStorage.setItem('cachedLat', lat.toString());
                        await AsyncStorage.setItem('cachedLon', lon.toString());
                    }
                }
                await fetchTemperature(lat, lon);
            } catch (error) {
                console.error("初期データの取得エラー:", error);
            }
        };
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (hourlyTemps.length > 0) {
            let startIdx = startTime;
            let endIdx = endTime;
            
            if (endIdx <= startIdx) {
                endIdx += 24;
            }

            const selectedTemps = hourlyTemps.slice(startIdx, endIdx + 1);
            
            if (selectedTemps.length > 0) {
                const min = Math.min(...selectedTemps);
                const max = Math.max(...selectedTemps);
                const avg = selectedTemps.reduce((a, b) => a + b, 0) / selectedTemps.length;

                setTempRange({ min, max, avg });
                setTemperature(avg);
            }
        }
    }, [startTime, endTime, hourlyTemps]);

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
            Alert.alert("エラー", "え？裸で行くの？w", [{ text: "OK" }]);
            return;
        }
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) throw new Error('ユーザーIDが見つかりません');
            const today = new Date().toISOString().split('T')[0];
            const checkResponse = await fetch(`${config.serverIP}/api/check-outfit`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, date: today }),
            });
            const responseText = await checkResponse.text();
            if (!checkResponse.ok) throw new Error(`データの確認に失敗しました: ${responseText}`);
            const { exists, outfitId } = JSON.parse(responseText);

            if (exists) {
                await updateOutfit(userId, outfitId);
            } else {
                const createNewOutfit = async (userId: string) => {
                    try {
                        const response = await fetch(`${config.serverIP}/api/register-outfit`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId, date: new Date().toISOString(), clothesIds: selectedOutfit.map(item => item.id) }),
                        });
                        if (!response.ok) throw new Error('服の登録に失敗しました');
                        showSuccessMessage();
                    } catch (error) { console.error('新規登録エラー:', error); }
                };
                await createNewOutfit(userId);
            }
        } catch (error) { console.error('服の登録エラー:', error); }
    };

    const updateOutfit = async (userId: string, outfitId: string) => {
        try {
            const response = await fetch(`${config.serverIP}/api/update-outfit/${outfitId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, date: new Date().toISOString(), clothesIds: selectedOutfit.map(item => item.id) }),
            });
            if (!response.ok) throw new Error('服の更新に失敗しました');
            showSuccessMessage();
        } catch (error) { console.error('更新エラー:', error); }
    };

    const showSuccessMessage = () => {
        setShowFloatingMessage(true);
        setTimeout(() => { setShowFloatingMessage(false); navigation.goBack(); }, 2000);
    };

    const getImageSource = useCallback((item: ClothingItem) => {
        if (imageUrls[item.id]) return { uri: imageUrls[item.id] };
        if (item.imageUrl) {
            const fullUrl = item.imageUrl.startsWith('http') ? item.imageUrl : `${config.serverIP}${item.imageUrl}`;
            useEffect(() => { setImageUrls(prev => ({ ...prev, [item.id]: fullUrl })); }, [item.id, fullUrl]);
            return { uri: fullUrl };
        } else if (item.base64) { return { uri: `data:image/jpeg;base64,${item.base64}` }; }
        return require('../images/default-image.png');
    }, [imageUrls]);

    const clearImageUrlCache = useCallback(() => setImageUrls({}), []);

    useEffect(() => {
        if (clothes.length > 0) {
            const newImageUrls: { [key: string]: string } = {};
            clothes.forEach(item => {
                if (item.imageUrl) {
                    newImageUrls[item.id] = item.imageUrl.startsWith('http') ? item.imageUrl : `${config.serverIP}${item.imageUrl}`;
                }
            });
            setImageUrls(newImageUrls);
        }
    }, [clothes]);

    const fetchTemperature = async (lat: number, lon: number) => {
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m&timezone=Asia%2FTokyo&forecast_days=2`
            );
            if (!response.ok) throw new Error('気温の取得に失敗しました');
            
            const data = await response.json();
            setHourlyTemps(data.hourly.temperature_2m);
            return data.current_weather.temperature;
        } catch (error) {
            console.error('気温取得エラー:', error);
            return null;
        }
    };

    // ★ マップを開く時の処理
    const handleOpenMap = () => {
        // すでに決定した場所があればそこを、なければ現在地(GPS)をセット
        const targetLat = confirmedLocation ? confirmedLocation.lat : initialLocation.latitude;
        const targetLon = confirmedLocation ? confirmedLocation.lon : initialLocation.longitude;

        setMapRegion({
            latitude: targetLat,
            longitude: targetLon,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
        });
        setCenterCoordinate({ latitude: targetLat, longitude: targetLon });
        setShowLocationModal(true);
    };

    const handleLocationSelect = async () => {
        setShowLocationModal(false);
        if (selectedLocation) {
            // ★ 「決定」を押した時だけ、その場所を記憶する
            setConfirmedLocation(selectedLocation);
            await fetchTemperature(selectedLocation.lat, selectedLocation.lon);
        }
    };

    const onRegionChangeComplete = (region: any) => {
        setMapRegion(region);
        setCenterCoordinate({ latitude: region.latitude, longitude: region.longitude });
        // これはドラッグ中の「仮の場所」として保存しておく
        setSelectedLocation({ lat: region.latitude, lon: region.longitude });
    };

    useEffect(() => {
        if (showFloatingMessage) {
            const interval = setInterval(() => {
                setGreetingIcon(prev => prev === "human-greeting" ? "human-handsdown" : "human-greeting");
            }, 500);
            setTimeout(() => clearInterval(interval), 2000);
            return () => clearInterval(interval);
        }
    }, [showFloatingMessage]);

    const renderItem = ({ item }: { item: ClothingItem }) => {
        const isSelected = selectedOutfit.some(selected => selected.id === item.id);
        return (
            <TouchableOpacity onPress={() => toggleClothingSelection(item)} style={styles.itemContainer}>
                <Image source={getImageSource(item)} style={[styles.image, isSelected && styles.selectedImage]} />
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
            cloth.category === item && cloth.temperature != null && temperature != null && Math.abs(cloth.temperature - temperature) <= 5
        );
        if (clothesInTemperatureRange.length === 0) return null;

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

    const categories = [...new Set(filteredClothes.map(item => item.category))]
        .sort((a, b) => (categoryOrder[a] || Number.MAX_SAFE_INTEGER) - (categoryOrder[b] || Number.MAX_SAFE_INTEGER));

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <>
            <View style={styles.logoContainer}>
                <Image source={require('../images/ClosEt_logo.png')} style={styles.logo} />
            </View>
            <View style={styles.divider} />
            <View style={styles.container}>
                
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <AntDesign name="left" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={styles.screenTitle}>行き先と時間を設定</Text>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity 
                        style={styles.mapButton}
                        onPress={handleOpenMap} // ★ handleOpenMap に変更
                    >
                        <Entypo name="location" size={24} color="black" />
                    </TouchableOpacity>
                </View>

                <View style={styles.dashboardContainer}>
                    <View style={styles.timePickerRow}>
                        <View style={styles.pickerWrapper}>
                            <Text style={styles.pickerLabel}>出発</Text>
                            <Picker
                                selectedValue={startTime}
                                onValueChange={(itemValue) => setStartTime(itemValue)}
                                style={styles.timePicker}
                                mode="dropdown"
                            >
                                {hours.map(h => <Picker.Item key={`start-${h}`} label={`${h}:00`} value={h} />)}
                            </Picker>
                        </View>
                        <Text style={styles.timeArrow}>→</Text>
                        <View style={styles.pickerWrapper}>
                            <Text style={styles.pickerLabel}>帰宅</Text>
                            <Picker
                                selectedValue={endTime}
                                onValueChange={(itemValue) => setEndTime(itemValue)}
                                style={styles.timePicker}
                                mode="dropdown"
                            >
                                {hours.map(h => <Picker.Item key={`end-${h}`} label={`${h}:00`} value={h} />)}
                            </Picker>
                        </View>
                    </View>

                    {tempRange && (
                        <View style={styles.tempInfoContainer}>
                            <View style={styles.tempBlock}>
                                <Text style={styles.tempLabel}>最低</Text>
                                <Text style={[styles.tempValue, { color: '#007AFF' }]}>{Math.round(tempRange.min)}℃</Text>
                            </View>
                            <View style={styles.tempBlock}>
                                <Text style={styles.tempLabel}>基準(平均)</Text>
                                <Text style={styles.tempValueMain}>{Math.round(tempRange.avg)}℃</Text>
                            </View>
                            <View style={styles.tempBlock}>
                                <Text style={styles.tempLabel}>最高</Text>
                                <Text style={[styles.tempValue, { color: '#FF3B30' }]}>{Math.round(tempRange.max)}℃</Text>
                            </View>
                        </View>
                    )}
                </View>
                <View style={styles.divider} />

                <FlatList
                    style={{ flex: 1 }}
                    data={categories}
                    renderItem={renderCategory}
                    keyExtractor={(item) => item}
                    contentContainerStyle={styles.clothesList}
                />
                <View style={styles.centerButtonContainer}>
                    <CustomButton title="おでかけ" onPress={registerOutfit} />
                </View>
            </View>

            {/* ★ 閉じるボタン等でのリセット処理も削除 */}
            <Modal visible={showLocationModal} transparent={true} animationType="slide" onRequestClose={() => { clearImageUrlCache(); setShowLocationModal(false); }}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setShowLocationModal(false); }} />
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity style={styles.modalBackButton} onPress={() => { setShowLocationModal(false); }}>
                                <AntDesign name="left" size={24} color="black" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>行き先を選択</Text>
                        </View>
                        <View style={styles.mapContainer}>
                            <MapView
                                provider={PROVIDER_GOOGLE} style={styles.map} region={mapRegion} onRegionChangeComplete={onRegionChangeComplete}
                            />
                            <View style={styles.centerMarker}>
                                <Entypo name="location-pin" size={40} color="red" />
                            </View>
                        </View>
                        <View style={[styles.buttonContainer, { width: '80%', paddingBottom: 10 }]}>
                            <CustomButton title="決定" onPress={handleLocationSelect} />
                        </View>
                    </View>
                </View>
            </Modal>

            {showFloatingMessage && (
                <View style={styles.floatingMessageContainer}>
                    <View style={styles.speechBubble}>
                        <Text style={styles.floatingMessageText}>いってらっしゃい！</Text>
                        <View style={styles.speechBubbleTriangle} />
                    </View>
                    <MaterialCommunityIcons name={greetingIcon} size={60} color="black" style={styles.greetingIcon} />
                </View>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: 'white' },
    logoContainer: { alignItems: 'center', padding: 20, backgroundColor: 'white' },
    logo: { width: 100, height: 50 },
    divider: { borderBottomColor: '#ccc', borderBottomWidth: 1, marginBottom: 5 },
    inputContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    backButton: { marginRight: 10 },
    mapButton: { marginRight: 10 },
    centerButtonContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 30, width: '100%' },
    clothesList: { paddingBottom: 20 },
    itemContainer: { width: 100, height: 100, marginRight: 10, position: 'relative' },
    image: { width: '100%', height: '100%', borderRadius: 5 },
    selectedImage: { opacity: 0.7 },
    selectionOrderBadge: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -20 }, { translateY: -20 }], justifyContent: 'center', alignItems: 'center' },
    checkmarkIcon: { opacity: 0.9 },
    categoryTitle: { fontSize: 16, fontWeight: 'bold', marginVertical: 10 },
    imageList: { paddingHorizontal: 10 },
    screenTitle: { fontSize: 18, marginLeft: 10, fontWeight: 'bold' },
    
    dashboardContainer: { backgroundColor: '#f8f9fa', borderRadius: 15, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
    timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    
    pickerWrapper: { 
        flex: 1, 
        backgroundColor: 'white', 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#ddd',
        justifyContent: 'center'
    },
    pickerLabel: { 
        fontSize: 12, 
        color: 'gray', 
        marginTop: 8, 
        fontWeight: 'bold',
        textAlign: 'center'
    },
    timePicker: { 
        width: '100%', 
        height: 55 
    },
    
    timeArrow: { fontSize: 20, color: 'gray', marginHorizontal: 15, fontWeight: 'bold' },
    
    tempInfoContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'white', borderRadius: 10, paddingVertical: 10 },
    tempBlock: { alignItems: 'center' },
    tempLabel: { fontSize: 12, color: 'gray', marginBottom: 5 },
    tempValue: { fontSize: 20, fontWeight: 'bold' },
    tempValueMain: { fontSize: 26, fontWeight: 'bold', color: 'black' },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContainer: { width: '95%', height: '80%', backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', flexDirection: 'column' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee', zIndex: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    modalBackButton: { padding: 5 },
    mapContainer: { flex: 1, position: 'relative' },
    map: { width: '100%', height: '100%' },
    centerMarker: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, zIndex: 1 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'center', alignSelf: 'center', width: '100%', marginTop: 15, marginBottom: 10 },
    
    floatingMessageContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    floatingMessageText: { color: 'black', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    speechBubble: { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 20, borderWidth: 2, borderColor: '#000' },
    speechBubbleTriangle: { position: 'absolute', bottom: -10, left: '50%', marginLeft: -10, width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderTopWidth: 10, borderStyle: 'solid', backgroundColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#000' },
    greetingIcon: { marginTop: 10, marginLeft: 90 },
});

export default OutfitSelectionScreen;