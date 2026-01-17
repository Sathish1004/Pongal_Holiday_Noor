import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const OverallReportScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<any>(null);
    const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
    // Project filter if needed, for now global

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        setLoading(true);
        try {
            const query = dateRange ? `?fromDate=${dateRange.from}&toDate=${dateRange.to}` : '';
            const response = await api.get(`/admin/overall-report${query}`);
            setReportData(response.data);
        } catch (error) {
            console.error('Error fetching report:', error);
            Alert.alert('Error', 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!reportData) return;
        try {
            const html = generateReportHTML(reportData);
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    const handleDownloadCSV = async () => {
        if (!reportData) return;
        try {
            const csv = generateCSV(reportData);
            const fileName = `Overall_Report_${new Date().toISOString().split('T')[0]}.csv`;
            const fileUri = FileSystem.documentDirectory + fileName;
            await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
            await Sharing.shareAsync(fileUri, { UTI: '.csv', mimeType: 'text/csv' });
        } catch (error) {
            console.error('Error generating CSV:', error);
            Alert.alert('Error', 'Failed to generate CSV');
        }
    };

    const generateCSV = (data: any) => {
        let csv = 'Section,Item,Value,Details\n';

        // Company Overview
        csv += `Company Overview,Total Projects,${data.companyOverview.total_projects},\n`;
        csv += `Company Overview,Active Projects,${data.companyOverview.active_projects},\n`;
        csv += `Company Overview,Completed Projects,${data.companyOverview.completed_projects},\n`;
        csv += `Company Overview,Total Employees,${data.companyOverview.total_employees},\n`;

        // Financials
        csv += `Financial Summary,Total Budget,${data.financialSummary.total_budget},\n`;
        csv += `Financial Summary,Total Expenses,${data.financialSummary.total_out},\n`;
        csv += `Financial Summary,Balance,${data.financialSummary.balance},\n`;

        // Project Summary
        data.projectSummary.forEach((p: any) => {
            csv += `Project Summary,${p.name},${p.status},Progress: ${p.progress}%\n`;
        });

        // Risks
        data.risks.delayed_tasks.forEach((t: any) => {
            csv += `Risk - Delayed Task,${t.name},Due: ${new Date(t.due_date).toLocaleDateString()},Project: ${t.project_name}\n`;
        });

        return csv;
    };

    const generateReportHTML = (data: any) => {
        return `
            <html>
                <head>
                    <style>
                        body { font-family: Helvetica, Arial, sans-serif; padding: 20px; }
                        h1 { color: #8B0000; text-align: center; }
                        h2 { color: #333; border-bottom: 2px solid #8B0000; padding-bottom: 5px; margin-top: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .stat-grid { display: flex; flex-wrap: wrap; gap: 10px; }
                        .stat-card { border: 1px solid #ddd; padding: 10px; width: 45%; background: #f9f9f9; }
                        .risk { color: red; }
                    </style>
                </head>
                <body>
                    <h1>Noor Construction - Overall Report</h1>
                    <p>Generated on: ${new Date(data.generatedAt).toLocaleString()}</p>

                    <h2>Company Overview</h2>
                    <div class="stat-grid">
                        <div class="stat-card"><b>Total Projects:</b> ${data.companyOverview.total_projects}</div>
                        <div class="stat-card"><b>Active Projects:</b> ${data.companyOverview.active_projects}</div>
                        <div class="stat-card"><b>Completed Projects:</b> ${data.companyOverview.completed_projects}</div>
                        <div class="stat-card"><b>Total Employees:</b> ${data.companyOverview.total_employees}</div>
                    </div>

                    <h2>Financial Summary</h2>
                    <table>
                        <tr><th>Total Budget</th><th>Total Received</th><th>Total Expenses</th><th>Balance</th></tr>
                        <tr>
                            <td>${Number(data.financialSummary.total_budget).toLocaleString()}</td>
                            <td>${Number(data.financialSummary.total_in).toLocaleString()}</td>
                            <td>${Number(data.financialSummary.total_out).toLocaleString()}</td>
                            <td>${Number(data.financialSummary.balance).toLocaleString()}</td>
                        </tr>
                    </table>

                    <h2>Project Summary</h2>
                    <table>
                        <tr><th>Project</th><th>Location</th><th>Status</th><th>Progress</th><th>Budget</th></tr>
                        ${data.projectSummary.map((p: any) => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.location}</td>
                                <td>${p.status}</td>
                                <td>${Math.round(p.progress || 0)}%</td>
                                <td>${Number(p.budget).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </table>

                     <h2>Department/Employee Performance</h2>
                     <table>
                        <tr><th>Employee</th><th>Role</th><th>Assigned Tasks</th><th>Completed</th><th>Status</th></tr>
                        ${data.employeePerformance.map((e: any) => `
                            <tr>
                                <td>${e.name}</td>
                                <td>${e.role}</td>
                                <td>${e.assigned_tasks}</td>
                                <td>${e.completed_tasks}</td>
                                <td>${e.performance_status}</td>
                            </tr>
                        `).join('')}
                    </table>

                    <h2>Risk Indicators</h2>
                    <h3>Delayed Tasks</h3>
                    <ul>
                        ${data.risks.delayed_tasks.map((t: any) => `
                            <li class="risk">${t.name} (Due: ${new Date(t.due_date).toLocaleDateString()}) - ${t.project_name}</li>
                        `).join('')}
                    </ul>
                </body>
            </html>
        `;
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#8B0000" />
            </View>
        );
    }

    if (!reportData) return null;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Overall Report</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={handleDownloadPDF}>
                        <Ionicons name="document-text-outline" size={24} color="#8B0000" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDownloadCSV}>
                        <Ionicons name="download-outline" size={24} color="#8B0000" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Company Overview Section */}
                <Text style={styles.sectionTitle}>Company Overview</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Projects</Text>
                        <Text style={styles.statValue}>{reportData.companyOverview.total_projects}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Active</Text>
                        <Text style={[styles.statValue, { color: '#059669' }]}>{reportData.companyOverview.active_projects}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Completed</Text>
                        <Text style={[styles.statValue, { color: '#2563EB' }]}>{reportData.companyOverview.completed_projects}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Employees</Text>
                        <Text style={styles.statValue}>{reportData.companyOverview.total_employees}</Text>
                    </View>
                </View>

                {/* Financial Summary */}
                <Text style={styles.sectionTitle}>Financial Summary</Text>
                <View style={[styles.card, { backgroundColor: '#1F2937' }]}>
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.darkLabel}>Total Budget</Text>
                            <Text style={styles.darkValue}>{Number(reportData.financialSummary.total_budget).toLocaleString()}</Text>
                        </View>
                        <View>
                            <Text style={styles.darkLabel}>Balance</Text>
                            <Text style={[styles.darkValue, { color: '#10B981' }]}>{Number(reportData.financialSummary.balance).toLocaleString()}</Text>
                        </View>
                    </View>
                    <View style={[styles.row, { marginTop: 15 }]}>
                        <View>
                            <Text style={styles.darkLabel}>Total Received</Text>
                            <Text style={styles.darkValue}>{Number(reportData.financialSummary.total_in).toLocaleString()}</Text>
                        </View>
                        <View>
                            <Text style={styles.darkLabel}>Total Expenses</Text>
                            <Text style={[styles.darkValue, { color: '#EF4444' }]}>{Number(reportData.financialSummary.total_out).toLocaleString()}</Text>
                        </View>
                    </View>
                </View>

                {/* Project Summary */}
                <Text style={styles.sectionTitle}>Project Status</Text>
                {reportData.projectSummary.map((project: any) => (
                    <View key={project.id} style={styles.projectCard}>
                        <View style={styles.row}>
                            <Text style={styles.projectName}>{project.name}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: project.status === 'active' ? '#D1FAE5' : '#F3F4F6' }]}>
                                <Text style={{ fontSize: 10, color: project.status === 'active' ? '#065F46' : '#6B7280' }}>{project.status.toUpperCase()}</Text>
                            </View>
                        </View>
                        <Text style={styles.location}>{project.location}</Text>

                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${project.progress || 0}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(project.progress || 0)}% Complete</Text>

                        <View style={[styles.row, { marginTop: 8 }]}>
                            <Text style={styles.detailText}>Tasks: {project.completed_tasks}/{project.total_tasks}</Text>
                            <Text style={styles.detailText}>Pending Approval: {project.waiting_approval_tasks}</Text>
                        </View>
                    </View>
                ))}

                {/* Task Overview */}
                <Text style={styles.sectionTitle}>Task Statistics</Text>
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: '#ECFDF5' }]}>
                        <Text style={styles.statLabel}>Completed</Text>
                        <Text style={[styles.statValue, { color: '#059669' }]}>{reportData.taskOverview.completed_tasks}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={styles.statLabel}>Pending Approval</Text>
                        <Text style={[styles.statValue, { color: '#D97706' }]}>{reportData.taskOverview.waiting_approval_tasks}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                        <Text style={styles.statLabel}>Overdue</Text>
                        <Text style={[styles.statValue, { color: '#DC2626' }]}>{reportData.taskOverview.overdue_tasks}</Text>
                    </View>
                </View>

                {/* Delays & Risks */}
                {reportData.risks.delayed_tasks.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: '#DC2626' }]}>Risk Indicators - Delayed Tasks</Text>
                        <View style={styles.card}>
                            {reportData.risks.delayed_tasks.map((task: any, index: number) => (
                                <View key={index} style={styles.riskItem}>
                                    <View>
                                        <Text style={styles.riskTitle}>{task.name}</Text>
                                        <Text style={styles.riskSub}>{task.project_name}</Text>
                                    </View>
                                    <Text style={styles.riskDate}>Due: {new Date(task.due_date).toLocaleDateString()}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                <View style={{ height: 40 }} />

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 50 },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    content: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 24, marginBottom: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: { flex: 1, minWidth: '45%', backgroundColor: '#fff', padding: 16, borderRadius: 12, elevation: 1 }, // shadow omitted for brevity
    statLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    darkLabel: { color: '#9CA3AF', fontSize: 12 },
    darkValue: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 },
    projectCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1 },
    projectName: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
    location: { color: '#6B7280', fontSize: 12, marginBottom: 12 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    progressBarBg: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 4 },
    progressBarFill: { height: 6, backgroundColor: '#059669', borderRadius: 3 },
    progressText: { fontSize: 12, color: '#059669', fontWeight: '500', alignSelf: 'flex-end' },
    detailText: { fontSize: 12, color: '#6B7280' },
    riskItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    riskTitle: { fontWeight: '600', color: '#1F2937' },
    riskSub: { fontSize: 12, color: '#6B7280' },
    riskDate: { color: '#DC2626', fontSize: 12, fontWeight: '500' }
});

export default OverallReportScreen;
