import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Image, FlatList, RefreshControl, TextInput, TouchableOpacity, Text, Modal, ScrollView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AntDesign, Ionicons, Octicons } from '@expo/vector-icons';
import config from '@/config';
import CustomButton from './customButton';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';

const { width } = Dimensions.get('window');

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

const categoryOrder: { [key: string]: number } = {
    'outerwear': 1,
    'tops': 2,
    'pants': 3,
    'skirt': 4,
    'onepiece': 5,
    'other': 6
};

const ClosetScreen = () => {
    const [clothes, setClothes] = useState<ClothingItem[]>([]);
    const [filteredClothes, setFilteredClothes] = useState<ClothingItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSortModal, setShowSortModal] = useState(false);
    const [sortOrder, setSortOrder] = useState('登録順');
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedTemperatures, setSelectedTemperatures] = useState<string[]>([]);
    const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);

    useEffect(() => {
        const fetchUserId = async () => {
            const storedUserId = await AsyncStorage.getItem('userId');
            setUserId(storedUserId);
        };
        fetchUserId().then(() => {
            if (userId) {
                fetchClothes(userId);
            }
        });
    }, [userId]);

    useEffect(() => {
        if (clothes.length > 0) {
            const filtered = clothes.filter(item => 
                item.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredClothes(filtered);
        }
    }, [searchQuery, clothes]);

    const fetchClothes = async (userId: string): Promise<ClothingItem[]> => {
        try {
            const response = await fetch(`http://${config.serverIP}:3000/api/images?userId=${userId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setClothes(data);
            setFilteredClothes(data);
            return data; // データを返す
            } catch (error) {
            console.error('Error fetching clothes:', error);
            return []; // エラー時は空の配列を返す
        }
    };

    const sortClothes = useCallback((order: string) => {
        let sorted = [...filteredClothes];
        switch (order) {
            case '登録順':
                sorted.sort((a, b) => {
                    const orderA = categoryOrder[a.category] || Number.MAX_SAFE_INTEGER;
                    const orderB = categoryOrder[b.category] || Number.MAX_SAFE_INTEGER;
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                });
                break;
            case '暖かさ順':
            case '寒さ順':
                sorted.sort((a, b) => {
                    const orderA = categoryOrder[a.category] || Number.MAX_SAFE_INTEGER;
                    const orderB = categoryOrder[b.category] || Number.MAX_SAFE_INTEGER;
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    return order === '暖かさ順' 
                    ? b.temperature - a.temperature 
                    : a.temperature - b.temperature;
                });
                break;
        }
        setFilteredClothes(sorted);
        setSortOrder(order);
    }, [filteredClothes]);

    const SortModal = () => (
        <Modal visible={showSortModal} transparent={true} animationType="fade" onRequestClose={() => setShowSortModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSortModal(false)}>
                <View style={styles.modalContent}>
                    <TouchableOpacity activeOpacity={1}>
                        {['登録順', '暖かさ順', '寒さ順'].map((option) => (
                            <TouchableOpacity key={option} style={styles.modalOption} onPress={() => { sortClothes(option); setShowSortModal(false); }}>
                                <Text>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const FilterModal = () => (
        <Modal visible={showFilterModal} transparent={true} animationType="fade" onRequestClose={() => setShowFilterModal(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilterModal(false)}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>カテゴリ</Text>
                    {['outerwear', 'tops', 'pants', 'skirt', 'onepiece', 'other'].map((category) => (
                        <TouchableOpacity key={category} style={styles.checkboxContainer} onPress={() => toggleCategory(category)}>
                            <View style={[styles.checkbox, selectedCategories.includes(category) && styles.checked]}>
                                {selectedCategories.includes(category) && (
                                    <Ionicons name="checkmark" size={16} color="white" />
                                )}
                            </View>
                            <Text style={styles.checkboxLabel}>{categoryMap[category] || category}</Text>
                        </TouchableOpacity>
                    ))}
                    <Text style={styles.modalTitle}>温度</Text>
                    {['-10~-5', '-5~0', '0~5', '5~10', '10~15', '15~20', '20~25', '25~30', '30~35', '35~40'].map((temp) => (
                        <TouchableOpacity key={temp} style={styles.checkboxContainer} onPress={() => toggleTemperature(temp)}>
                            <View style={[styles.checkbox, selectedTemperatures.includes(temp) && styles.checked]}>
                                {selectedTemperatures.includes(temp) && (
                                    <Ionicons name="checkmark" size={16} color="white" />
                                )}
                            </View>
                            <Text style={styles.checkboxLabel}>{`${temp}℃`}</Text>
                        </TouchableOpacity>
                    ))}
                    <View style={styles.buttonContainer}>
                        <CustomButton title="リセット" onPress={resetFilters} whiteBackground={true} />
                        <View style={styles.buttonSpacer} />
                        <CustomButton title="適用" onPress={applyFilters} />
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const toggleTemperature = (temp: string) => {
        setSelectedTemperatures(prev =>
            prev.includes(temp) ? prev.filter(t => t !== temp) : [...prev, temp]
        );
    };

    const applyFilters = () => {
        const filtered = clothes.filter(item => {
            const categoryMatch = selectedCategories.length === 0 || 
                selectedCategories.includes(item.category);
            const tempMatch = selectedTemperatures.length === 0 || 
                selectedTemperatures.some(range => {
                    const [min, max] = range.split('~').map(Number);
                    return item.temperature >= min && item.temperature <= max;
                });
            return categoryMatch && tempMatch;
        });
        setFilteredClothes(filtered);
        setShowFilterModal(false);
    };

    const resetFilters = () => {
        setSelectedCategories([]);
        setSelectedTemperatures([]);
        setFilteredClothes(clothes);
    };

    const onRefresh = useCallback(() => {
        if (userId) {
            setRefreshing(true);
            fetchClothes(userId).then((newClothes) => {
                const sortedClothes = [...newClothes].sort((a, b) => {
                    const orderA = categoryOrder[a.category] || Number.MAX_SAFE_INTEGER;
                    const orderB = categoryOrder[b.category] || Number.MAX_SAFE_INTEGER;
                    return orderA - orderB;
                });
                setClothes(sortedClothes);
                setFilteredClothes(sortedClothes);
                setRefreshing(false);
            });
        }
    }, [userId]);

    const getImageSource = (item: ClothingItem) => {
        if (item.imageUrl) {
            const fullUrl = item.imageUrl.startsWith('http') 
                ? item.imageUrl 
                : `http://${config.serverIP}:3000${item.imageUrl}`;
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

    const renderCategory = ({ item }: { item: string }) => (
        <View>
            <Text style={styles.categoryTitle}>{categoryMap[item] || item}</Text>
            <FlatList data={filteredClothes.filter(cloth => cloth.category === item)} renderItem={renderItem} keyExtractor={(item) => item.id} numColumns={3} contentContainerStyle={styles.imageList} columnWrapperStyle={{ justifyContent: 'flex-start' }} />
        </View>
    );

    const categories = [...new Set(filteredClothes.map(item => item.category))];

    const EditItemScreen = () => {
        const [editName, setEditName] = useState(selectedItem?.name || '');
        const [editCategory, setEditCategory] = useState(selectedItem?.category || '');
        const [editTemperature, setEditTemperature] = useState(selectedItem?.temperature || 20);

        const updateItem = async () => {
            // バリデーションチェック
            if (!editName.trim()) {
                Alert.alert('エラー', '名称を入力してください');
                return;
            }

            if (editName.length > 50) {
                Alert.alert('エラー', '名称は50文字以内で入力してください');
                return;
            }

            if (!editCategory) {
                Alert.alert('エラー', 'カテゴリを選択してください');
                return;
            }

            if (selectedItem && userId) {
                try {
                    const response = await fetch(`http://${config.serverIP}:3000/api/update`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: selectedItem.id,
                            userId: userId,
                            name: editName.trim(),  // 前後の空白を削除
                            category: editCategory,
                            temperature: editTemperature
                        }),
                    });
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    await fetchClothes(userId);
                    setSelectedItem(null);
                } catch (error) {
                    console.error('Error updating item:', error);
                    Alert.alert('エラー', '更新に失敗しました');
                }
            }
        };

        const deleteItem = async () => {
            if (selectedItem && userId) {
                try {
                    const response = await fetch(`http://${config.serverIP}:3000/api/delete`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: selectedItem.id,
                            userId: userId
                        }),
                    });
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    await fetchClothes(userId);
                    setSelectedItem(null);
                } catch (error) {
                    console.error('アイテムの削除中にエラーが発生しました:', error);
                }
            }
        };

        if (!selectedItem) return null;

        return (
        <ScrollView>
            <View style={styles.logoContainer}>
                <Image source={require('../images/ClosEt_logo.png')} style={styles.logo} />
            </View>
            <View style={styles.divider} />
            <View style={styles.editContainer}>
                <View style={styles.editInputContainer}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setSelectedItem(null)}
                    >
                    <AntDesign name="left" size={24} color="black" />
                </TouchableOpacity>
                <TextInput
                    style={styles.input}
                    placeholder="名称"
                    value={editName}
                    onChangeText={setEditName}
                />
            </View>
            <Image 
                source={getImageSource(selectedItem)}
                style={styles.preview} 
            />
            <Text style={styles.editLabel}>{editTemperature}℃</Text>
            <View style={styles.editSliderContainer}>
                <Ionicons name="snow-outline" size={24} color="black" />
                <Slider
                    style={styles.editSlider}
                    minimumValue={-10}
                    maximumValue={40}
                    step={1}
                    value={editTemperature}
                    onValueChange={setEditTemperature}
                    thumbTintColor="white"
                    minimumTrackTintColor="black"
                    maximumTrackTintColor="#BFBFBF"
                />
                <Ionicons name="sunny-outline" size={24} color="black" />
            </View>
            <View style={styles.editPickerContainer}>
                <Picker
                    selectedValue={editCategory}
                    style={styles.editPicker}
                    onValueChange={(itemValue: string) => setEditCategory(itemValue)}
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
            <View style={[styles.editButtonContainer, { width: '50%' }]}>
                <CustomButton
                    title="お直し"
                    onPress={updateItem}
                />
                <View style={styles.buttonSpacer} />
                <CustomButton
                    title="手放す"
                    onPress={deleteItem}
                    whiteBackground={true}
                />
            </View>
            </View>
        </ScrollView>
        );
    };

    return (
        <>
            {selectedItem ? (
                <EditItemScreen />
            ) : (
                <>
                <View style={styles.logoContainer}>
                    <Image source={require('../images/ClosEt_logo.png')} style={styles.logo} />
                    <TextInput style={styles.searchInput} placeholder="アイテムを探す" value={searchQuery} onChangeText={setSearchQuery} />
                </View>
                <View style={styles.divider} />
                <View style={styles.container}>
                    <View style={styles.iconContainer}>
                    <TouchableOpacity 
                        style={styles.iconButton} 
                        onPress={() => setShowSortModal(true)}
                    >
                        <Octicons name="sort-desc" size={24} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.iconButton} 
                        onPress={() => setShowFilterModal(true)}
                    >
                        <Ionicons name="funnel-outline" size={24} color="black" />
                    </TouchableOpacity>
                    </View>
                    <FlatList
                    data={categories}
                    renderItem={renderCategory}
                    keyExtractor={(item) => item}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    />
                </View>
                <SortModal />
                <FilterModal />
                </>
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
    searchInput: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginTop: 10,
        width: '90%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 10,
        marginRight: 20,
    },
    iconButton: {
        paddingLeft: 15,
    },
    imageList: {
        marginBottom: 20,
        width: '100%',
    },
    itemContainer: {
        width: (Dimensions.get('window').width - 40) / 3,
        marginBottom: 10,
        paddingHorizontal: 5,
    },
    image: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 5,
    },
    itemName: {
        marginTop: 5,
        fontSize: 12,
        textAlign: 'center',
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    buttonContainer: {
        width: '60%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginLeft: 10,
    },
    buttonSpacer: {
        width: 20,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    modalOption: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderWidth: 1,
        borderColor: 'black',
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checked: {
        backgroundColor: 'black',
    },
    checkboxLabel: {
        fontSize: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
        width: '100%',
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
    editLabel: {
        fontSize: 16,
        marginTop: 5,
    },
    editSliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        marginBottom: 20,
    },
    editSlider: {
        flex: 1,
        marginHorizontal: 10,
    },
    editPickerContainer: {
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
    editPicker: {
        ...Platform.select({
            ios: {
                width: '100%',
            },
            android: {
                width: '100%',
            },
        }),
    },
    editButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    editInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    editContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
});

export default ClosetScreen;