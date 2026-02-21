import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";
import { View, StyleSheet, Text, Image, FlatList, Dimensions, TouchableOpacity } from "react-native";
import CustomButton from "./customButton";
import config from "@/config";
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from "react";

type ClothingItem = {
    imageUrl: any;
    id: string;
    base64: string;
    name: string;
    category: string;
    temperature: number;
    createdAt: string;
};

const categoryMap: { [key: string]: string } = {
    'outerwear': 'ジャケット/アウター',
    'tops': 'トップス',
    'pants': 'パンツ',
    'skirt': 'スカート',
    'onepiece': 'ワンピース/ドレス',
    'other': 'その他'
};

type RootStackParamList = {
    Main: { screen: string };
};

const FeedbackScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const [feedback, setFeedback] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
    const [filteredClothes, setFilteredClothes] = useState<ClothingItem[]>([]);

    const getImageSource = (item: ClothingItem) => {
        if (item.imageUrl) {
            const fullUrl = item.imageUrl.startsWith('http') 
                ? item.imageUrl 
                : `http://${config.serverIP}:3001${item.imageUrl}`;
            return { uri: fullUrl };
        } else if (item.base64) {
            return { uri: `data:image/jpeg;base64,${item.base64}` };
        }
        return require('../images/default-image.png');
    };

    const renderItem = ({ item }: { item: ClothingItem }) => (
        <TouchableOpacity onPress={() => setSelectedItem(item)} style={styles.itemContainer}>
            <Image 
                source={getImageSource(item)}
                style={styles.image} 
            />
        </TouchableOpacity>
    );

    const submitFeedback = async () => {
        if (feedback === null) return;
        
        try {
            const userId = await AsyncStorage.getItem('userId');
            // ★修正：new Date()に戻しました（現在時刻で送信）
            const response = await fetch(`http://${config.serverIP}:3001/api/submit-feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, feedback, date: new Date() }),
            });
            if (!response.ok) throw new Error('フィードバックの送信に失敗しました');
            
            navigation.navigate('Main', { screen: 'ホーム' });
            
        } catch (error) {
            console.error('Error submitting feedback:', error);
        }
    };

    const fetchTodaysClothes = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            // ★修正：今日の日付を自動取得するロジックに戻しました
            const today = new Date().toISOString().split('T')[0];
            
            const dailyInfoResponse = await fetch(
                `http://${config.serverIP}:3001/api/daily-info?userId=${userId}&date=${today}`
            );
            
            if (!dailyInfoResponse.ok) throw new Error('日付の服の取得に失敗しました');
            
            const dailyInfo = await dailyInfoResponse.json();
            
            if (dailyInfo && dailyInfo.clothesIds) {
                const clothesResponse = await fetch(
                    `http://${config.serverIP}:3001/api/clothes-by-ids`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ clothesIds: dailyInfo.clothesIds })
                    }
                );
                
                if (!clothesResponse.ok) throw new Error('服の情報の取得に失敗しました');
                
                const clothes = await clothesResponse.json();
                setFilteredClothes(clothes);
            }
        } catch (error) {
            console.error('Error fetching today\'s clothes:', error);
        }
    };

    useEffect(() => {
        fetchTodaysClothes();
    }, []);

    return (
        <>
            <View style={styles.logoContainer}>
                <Image source={require('../images/ClosEt_logo.png')} style={styles.logo} />
            </View>
            <View style={styles.divider} />
            <View style={styles.container}>
                <Text style={styles.question}>今日のコーデはどうでしたか？</Text>
                
                <Text style={styles.question}>今日のコーデ</Text>
                <FlatList
                    data={filteredClothes}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={3}
                    contentContainerStyle={styles.imageList}
                />

                <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                        <View key={rating} style={styles.ratingItem}>
                            <TouchableOpacity 
                                onPress={() => setFeedback(rating)}
                                style={[
                                    styles.ratingButton,
                                    feedback === rating && styles.selectedRatingInner
                                ]}
                            >
                                <View style={feedback === rating ? styles.innerCircle : null} />
                            </TouchableOpacity>
                            {rating === 1 && <Text style={styles.ratingLabel}>寒かった</Text>}
                            {rating === 3 && <Text style={styles.ratingLabel}>ちょうどいい</Text>}
                            {rating === 5 && <Text style={styles.ratingLabel}>暑かった</Text>}
                        </View>
                    ))}
                </View>
                <View style={[styles.buttonContainer, { width: '50%' }]}>
                    <CustomButton
                    title="送信"
                    onPress={submitFeedback}
                />
                </View>
                
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        padding: 20,
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
    question: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'left',
        marginVertical: 20,
        width: '100%',
        paddingHorizontal: 10,
    },
    imageList: {
        marginBottom: 20,
    },
    itemContainer: {
        width: (Dimensions.get('window').width - 40) / 3,
        marginBottom: 10,
        alignItems: 'center',
    },
    ratingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 30,
    },
    ratingItem: {
        alignItems: 'center',
    },
    ratingButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#D9D9D9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    selectedRatingInner: {
        backgroundColor: '#D9D9D9',
    },
    innerCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#333333',
    },
    ratingLabel: {
        fontSize: 12,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 20,
    },
    image: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 5,
    },
});

export default FeedbackScreen;