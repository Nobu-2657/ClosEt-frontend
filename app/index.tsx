import React, { useEffect } from 'react';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import HomeScreen from './after_register/home'; 
import ClosetScreen from './after_register/closet';
import CameraScreen from './after_register/camera';
import Login from './before_register/login';
import Register from './before_register/register';
import OutfitSelection from './after_register/outfitSelectionScreen';
import Feedback from './after_register/feedbackScreen';

// 型定義
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Closet: undefined;
  Camera: undefined;
  OutfitSelection: undefined;
  FeedbackScreen: undefined;
};

type TabNavigatorParamList = {
  ホーム: undefined;
  レジスター: undefined;
  クローゼット: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabNavigatorParamList>();

function TabNavigator() {
  const navigation = useNavigation<NavigationProp>();

  const handlePlusButtonPress = () => {
    navigation.navigate('Camera' as never);
  };

  // Notifications.setNotificationHandler({
  //   handleNotification: async () => ({
  //     shouldShowAlert: true,
  //     shouldPlaySound: false,
  //     shouldSetBadge: false,
  //   }),
  // });  

  // const scheduleDailyNotification = async () => {
  //   try {
  //     await Notifications.scheduleNotificationAsync({
  //       content: {
  //         title: 'フィードバックのお時間です！',
  //         body: '今日のコーデについてフィードバックをお願いします。',
  //         data: { screen: 'FeedbackScreen' },
  //         priority: 'high',
  //         vibrate: [0, 250, 250, 250],
  //       },
  //       trigger: {
  //         hour: 23,
  //         minute: 30,
  //         repeats: true,
  //         timezone: 'Asia/Tokyo',
  //         type: 'calender'
  //       },
  //     });
  //   } catch (error) {
  //     console.log('通知のスケジュール設定エラー:', error);
  //   }
  // };

  useEffect(() => {
    const setupNotifications = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      // if (status !== 'granted') {
      //   const { status: newStatus } = await Notifications.requestPermissionsAsync();
      //   if (newStatus !== 'granted') {
      //     console.log('Notification permission denied');
      //     return;
      //   }
      // }
      // await scheduleDailyNotification();
    };
  
    setupNotifications();
  }, []);  
  
  // useEffect(() => {
  //   const subscription = Notifications.addNotificationResponseReceivedListener(response => {
  //     console.log('通知タップ時のレスポンス:', response);
      
  //     if (Platform.OS === 'android') {
  //       setTimeout(() => {
  //         navigation.reset({
  //           index: 0,
  //           routes: [
  //             { name: 'Main' },
  //             { name: 'FeedbackScreen' }
  //           ],
  //         });
  //       }, 1000);
  //     } else {
  //       navigation.navigate('FeedbackScreen');
  //     }
  //   });

  //   return () => {
  //     subscription.remove();
  //   };
  // }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'ホーム') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'クローゼット') {
            iconName = focused ? 'shirt' : 'shirt-outline';
          } else if (route.name === 'レジスター') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
        tabBarShowLabel: false,
        tabBarStyle: route.name === 'レジスター' ? { display: 'none' } : undefined,
      })}
    >
      <Tab.Screen options={{headerShown: false}} name="ホーム" component={HomeScreen} />
      <Tab.Screen 
        options={{headerShown: false}} 
        name="レジスター" 
        component={CameraScreen}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handlePlusButtonPress();
          },
        }}
      />
      <Tab.Screen options={{headerShown: false}} name="クローゼット" component={ClosetScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen options={{headerShown: false}} name="Login" component={Login} />
        <Stack.Screen options={{headerShown: false}} name="Register" component={Register} />
        <Stack.Screen options={{headerShown: false}} name="Main" component={TabNavigator} />
        <Stack.Screen options={{headerShown: false}} name="Closet" component={ClosetScreen} />
        <Stack.Screen 
          name="Camera" 
          component={CameraScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen options={{ headerShown: false}} name="OutfitSelection" component={OutfitSelection} />
        <Stack.Screen options={{ headerShown: false}} name="FeedbackScreen" component={Feedback} />
      </Stack.Navigator>
  );
}