import { Tabs } from 'expo-router';
import { Camera, Calendar } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarStyle: { backgroundColor: '#000', borderTopColor: '#333' },
                tabBarActiveTintColor: '#4ade80',
                tabBarInactiveTintColor: '#666',
                headerShown: false
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Scan',
                    tabBarIcon: ({ color }) => <Camera color={color} />
                }}
            />
            <Tabs.Screen
                name="log"
                options={{
                    title: 'Log',
                    tabBarIcon: ({ color }) => <Calendar color={color} />
                }}
            />
        </Tabs>
    );
}
