import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import config from '../../config';
import CustomButton from '../after_register/customButton';
import { Ionicons } from '@expo/vector-icons'; // Expoを使用している場合

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  userEdit: undefined;
};
type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
type Props = {
  navigation: LoginScreenNavigationProp;
};

const Login = ({ navigation }: Props) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    }

    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      return emailRegex.test(email);
    };

    const validatePassword = (password: string): boolean => {
      // 最低8文字以上
      const minLength = password.length >= 8;
      
      // 大文字を含む
      const hasUpperCase = /[A-Z]/.test(password);
      
      // 小文字を含む
      const hasLowerCase = /[a-z]/.test(password);
      
      // 数字を含む
      const hasNumber = /[0-9]/.test(password);
      
      // 特殊文字を含む
      const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      
      return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol;
    };

    const handleEmailChange = (text: string) => {
        setEmail(text);
        if (!text.trim()) {
            setEmailError('メールアドレスを入力してください');
        } else if (!validateEmail(text)) {
            setEmailError('有効なメールアドレスを入力してください');
        } else {
            setEmailError('');
        }
    };

    const handlePasswordChange = (text: string) => {
        setPassword(text);
        if (!text) {
            setPasswordError('パスワードを入力してください');
        } else if (!validatePassword(text)) {
            setPasswordError('パスワードは8文字以上で、大文字・小文字・数字・記号をそれぞれ1つ以上含める必要があります');
        } else {
            setPasswordError('');
        }
    };

    const handleLogin = async () => {
      try {
        const response = await fetch(`http://${config.serverIP}:3000/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok) {
          if (data.user) {
            if (data.user.displayName) {
              await AsyncStorage.setItem('displayName', data.user.displayName);
            }
            if (data.user.id) {
              await AsyncStorage.setItem('userId', data.user.id);
            }
          }
          if (data.token) {
            await AsyncStorage.setItem('userToken', data.token);
          }
          navigation.navigate('Main');
        } else {
          Alert.alert('エラー', data.message || 'ログインに失敗しました');
        }
      } catch (error) {
        console.error('ログインエラー:', error);
        Alert.alert('エラー', 'ログイン中に問題が発生しました。');
      }
    };

    return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
            source={require('../images/ClosEt_logo.png')} // ロゴのパスを指定
            style={styles.logo} 
            resizeMode="contain" 
        />
      </View>
      <TextInput
        style={[styles.input, emailError ? styles.inputError : null]}
        placeholder="メールアドレス"
        value={email}
        onChangeText={handleEmailChange}
      />
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, passwordError ? styles.inputError : null]}
          placeholder="パスワード"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={handlePasswordChange}
        />
        <TouchableOpacity onPress={togglePasswordVisibility} style={styles.visibilityToggle}>
          <Ionicons 
            name={showPassword ? 'eye-off' : 'eye'} 
            size={24} 
            color="gray"
          />
        </TouchableOpacity>
      </View>
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      <CustomButton title="ログイン" onPress={handleLogin} />
      <CustomButton 
        title="新規登録はこちら"
        onPress={() => navigation.navigate('Register')}
        whiteBackground={true}
      />
    </View>
    );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      alignItems: 'center', // ロゴを中央揃え
    },
    logo: {
      width: 300, // ロゴの幅を指定
      height: 100, // ロゴの高さを指定
      marginBottom: 80, // ロゴとタイトルの間にスペースを追加
    },
    input: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        borderRadius: 10,
        width: '80%',
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      width: '80%',
    },
    passwordInput: {
      flex: 1,
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    visibilityToggle: {
      padding: 10,
      position: 'absolute',
      right: 0,
    },
    inputError: {
        borderColor: 'red',
    },
    errorText: {
        color: 'red',
        fontSize: 12,
        marginBottom: 5,
    },
});

export default Login;