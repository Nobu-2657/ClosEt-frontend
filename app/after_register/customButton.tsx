import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle, TextStyle } from 'react-native';

interface CustomButtonProps {
    title: string;
    onPress: (event: GestureResponderEvent) => void;
    style?: ViewStyle;
    whiteBackground?: boolean;
}

const CustomButton: React.FC<CustomButtonProps> = ({ title, onPress, style, whiteBackground = false }) => {
    return (
        <TouchableOpacity 
            style={[
                styles.button, 
                whiteBackground ? styles.whiteButton : styles.blackButton, 
                style
            ]} 
            onPress={onPress}
            activeOpacity={0.7} // 押した時の反応を分かりやすく
        >
            <Text style={[
                styles.buttonText, 
                whiteBackground ? styles.textForWhiteBG : styles.textForBlackBG
            ]}>
                {title}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
        width: '100%', // 呼び出し側で調整しやすいよう100%に
        elevation: 3, // Androidで影をつけてボタンらしく
    },
    blackButton: {
        backgroundColor: '#000000', // 純粋な黒
    },
    whiteButton: {
        backgroundColor: '#FFFFFF', // 純粋な白
        borderWidth: 1.5,
        borderColor: '#000000',
    },
    buttonText: {
        fontSize: 16, // 少し大きくして視認性向上
        fontWeight: 'bold',
    },
    textForBlackBG: {
        color: '#FFFFFF', // 黒背景には白文字
    },
    textForWhiteBG: {
        color: '#000000', // 白背景には黒文字
    },
});

export default CustomButton;