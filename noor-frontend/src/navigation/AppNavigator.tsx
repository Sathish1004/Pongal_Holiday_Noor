import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

// Screen imports
import HomeScreen from '../screens/HomeScreen'; // Professional Homepage
import LoginScreen from '../screens/LoginScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/EmployeeDashboardScreen';
import EmployeeTasksScreen from '../screens/EmployeeTasksScreen';
import EmployeeTaskDetailScreen from '../screens/EmployeeTaskDetailScreen';
import SiteManagementScreen from '../screens/SiteManagementScreen';
import TaskManagementScreen from '../screens/TaskManagementScreen';
import StageProgressScreen from '../screens/StageProgressScreen';
import EmployeeProjectDetailsScreen from '../screens/EmployeeProjectDetailsScreen';
import EmployeeManagementScreen from '../screens/EmployeeManagementScreen';
import EmployeeProfileScreen from '../screens/EmployeeProfileScreen';
import CompletedTasksScreen from '../screens/CompletedTasksScreen';

const Stack = createNativeStackNavigator();

const AppNavigator: React.FC = () => {
    const { user, isLoading } = useContext(AuthContext);

    // Show loading state while checking authentication
    if (isLoading) {
        return <HomeScreen />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    // Not logged in
                    <>
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen name="Login" component={LoginScreen} />
                    </>
                ) : user.role === 'admin' ? (
                    // Admin logged in
                    <>
                        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
                        <Stack.Screen name="OverallReport" component={require('../screens/OverallReportScreen').default} />
                        <Stack.Screen name="SiteManagement" component={SiteManagementScreen} />
                        <Stack.Screen name="TaskManagement" component={TaskManagementScreen} />
                        <Stack.Screen name="StageProgress" component={StageProgressScreen} />
                        <Stack.Screen name="EmployeeManagement" component={EmployeeManagementScreen} />
                        {/* Admin might generally not needed this but harmless */}
                        <Stack.Screen name="EmployeeProjectDetails" component={EmployeeProjectDetailsScreen} />
                    </>
                ) : (
                    // Employee logged in
                    <>
                        <Stack.Screen name="EmployeeDashboard" component={EmployeeDashboardScreen} />
                        <Stack.Screen name="EmployeeTasks" component={EmployeeTasksScreen} />
                        <Stack.Screen name="EmployeeTaskDetail" component={EmployeeTaskDetailScreen} />
                        <Stack.Screen name="StageProgress" component={StageProgressScreen} />
                        <Stack.Screen name="EmployeeProjectDetails" component={EmployeeProjectDetailsScreen} />
                        <Stack.Screen name="EmployeeProfile" component={EmployeeProfileScreen} />
                        <Stack.Screen name="CompletedTasks" component={CompletedTasksScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
