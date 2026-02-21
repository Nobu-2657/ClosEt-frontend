import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle } from 'react-native';

interface CustomButtonProps {
    title: string; // titleはstring型
    onPress: (event: GestureResponderEvent) => void; // onPressは関数で、引数にGestureResponderEventを取る
    style?: ViewStyle; // styleはオプショナルなViewStyle型
    whiteBackground?: boolean; // 白背景のオプション
}

const CustomButton: React.FC<CustomButtonProps> = ({ title, onPress, style, whiteBackground }) => {
    return (
        <TouchableOpacity 
            style={[styles.button, whiteBackground ? styles.whiteButton : styles.blackButton, style]} 
            onPress={onPress}
        >
            <Text style={[styles.buttonText, whiteBackground ? styles.whiteText : styles.blackText]}>{title}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        marginVertical: 5,
        width: '70%',
    },
    blackButton: {
        backgroundColor: 'black', // 黒の背景色
    },
    whiteButton: {
        backgroundColor: 'white', // 白の背景色
        borderWidth: 1, // 白ボタンの枠線（必要に応じて）
        borderColor: 'gray', // 枠線の色（必要に応じて）
        width: '70%',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    blackText: {
        color: 'white', // 黒ボタン用のテキスト色
    },
    whiteText: {
        color: 'black', // 白ボタン用のテキスト色
    },
});

export default CustomButton;