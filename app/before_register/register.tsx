import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, Alert, Image, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import config from '../../config';
import CustomButton from '../after_register/customButton';
import { AntDesign, Ionicons } from '@expo/vector-icons'; // Expoを使用している場合

type RootStackParamList = {
  Login: undefined;
  NewLogin: undefined;
  Main: undefined;
  userEdit: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;
type Props = {
  navigation: HomeScreenNavigationProp;
};

const Register = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  }

  const validateEmail = (email: string): boolean => {
    // 文字列の末尾の空白を考慮しないように、最初からtrimしたものを通すか、正規表現側で許容します
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i; // 末尾に i をつける
    console.log('Validating email:', email, 'Result:', emailRegex.test(email));
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

  const handleDisplayNameChange = (text: string) => {
    setDisplayName(text);
    if (!text.trim()) {
      setDisplayNameError('表示名を入力してください');
    } else {
      setDisplayNameError('');
    }
  };

  const handleEmailChange = async (text: string) => {
  const trimmedText = text.trim();
  setEmail(trimmedText);

  // 1. 未入力チェック
  if (!trimmedText) {
    setEmailError('メールアドレスを入力してください');
    return; // 処理を中断
  }

  // 2. 形式バリデーション
  if (!validateEmail(trimmedText)) {
    // 形式が不正な場合はエラーをセットして終了（fetchはしない）
    setEmailError('有効なメールアドレスを入力してください');
    // setEmailError(trimmedText + 'は有効なメールアドレスではありません'); // デバッグ用
    return; 
  }

  // ★重要★ ここに到達した時点で「形式は正しい」ので、一旦エラーをクリアする
  // これにより、通信中の「有効なメールアドレスを入力してください」という表示消えます
  setEmailError(''); 

  // 3. 重複チェック（サーバー通信）
  try {
    const response = await fetch(`http://${config.serverIP}/api/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedText }),
    });

    // 通信結果を待っている間にユーザーがさらに文字を打った可能性を考慮
    // (もし必要ならここで最新の state と trimmedText を比較するガードを入れます)

    if (!response.ok) {
      setEmailError('このメールアドレスは既に登録されています');
    } else {
      setEmailError(''); // 重複もなければ完全にクリア
    }
  } catch (error) {
    setEmailError('メールアドレスの確認中にエラーが発生しました');
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

  const validateInputs = () => {
    if (!email || !password || !displayName) {
      Alert.alert('エラー', 'すべての項目を入力してください。');
      return false;
    }
  
    if (emailError || passwordError || displayNameError) {
      Alert.alert('エラー', '入力内容に誤りがあります。修正してください。');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (isLoading) return; // 連打防止
    console.log('① 新規登録ボタンが押されました');
    if (!validateInputs()) {
      console.log('② バリデーションエラーで処理を中断しました');
      return;
    }
    console.log('③ サーバーと通信を開始します: ', config.serverIP);
    setIsLoading(true); // ローディング開始

    try {
      const response = await fetch(`http://${config.serverIP}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName,
          email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '登録に失敗しました');
      }

      // 登録成功時の処理
      if (result.user) {
        // 表示名をAsyncStorageに保存
        await AsyncStorage.setItem('displayName', displayName);
        
        // ユーザーIDをAsyncStorageに保存
        if (result.user.id) {
          await AsyncStorage.setItem('userId', result.user.id);
        }
        
        // トーク��がある場合は保存
        if (result.token) {
          await AsyncStorage.setItem('userToken', result.token);
        }
      }

      navigation.navigate('Main');
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('エラー', '登録中にエラーが発生しました: ' + error.message);
      } else {
        Alert.alert('エラー', '予期せぬエラーが発生しました');
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Login')}
      >
        <AntDesign name="left" size={24} color="black" />
      </TouchableOpacity>
      <View style={styles.logoContainer}>
        <Image 
            source={require('../images/ClosEt_logo.png')} // ロゴのパスを指定
            style={styles.logo} 
            resizeMode="contain" 
        />
      </View>
      <TextInput
        style={[styles.input, displayNameError ? styles.inputError : null]}
        placeholder="表示名"
        value={displayName}
        onChangeText={handleDisplayNameChange}
      />
      {displayNameError ? <Text style={styles.errorText}>{displayNameError}</Text> : null}

      <TextInput
        style={[styles.input, emailError ? styles.inputError : null]}
        placeholder="メールアドレス"
        value={email}
        onChangeText={handleEmailChange}
        // 👇 以下の3つを追加
        autoCapitalize="none"       // 先頭が大文字になるのを防ぐ
        keyboardType="email-address" // @マークがあるメール専用キーボードを出す
        autoCorrect={false}         // 勝手な修正を防ぐ
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

      <CustomButton title="新規登録" onPress={handleRegister} />
      {message ? <Text>{message}</Text> : null}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: 'white'
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
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
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

export default Register;
