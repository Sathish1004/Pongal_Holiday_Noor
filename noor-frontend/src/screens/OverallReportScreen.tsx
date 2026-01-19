import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import CustomDatePicker from '../components/CustomDatePicker';

// Helper to format YYYY-MM-DD safely without timezone shifts
const formatDateSafe = (dateInput: any) => {
    if (!dateInput) return '-';

    // Handle Date object directly
    if (dateInput instanceof Date) {
        return dateInput.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    const dateStr = dateInput.toString();

    // Handle ISO string or long string: take date part
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');

    // If we have YYYY-MM-DD
    if (parts.length === 3) {
        // Construct date as Local Time (h,m,s = 0) to avoid UTC shifts
        const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // Fallback for other formats (e.g. standard Date string)
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    return '-';
};

const OverallReportScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<any>(null);
    const [financialData, setFinancialData] = useState<any>(null); // NEW: Separate state for Financials
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    // Project Filter State (Moved to Local Financial Scope)
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    // Project collapsing state
    const [expandedProjects, setExpandedProjects] = useState<{ [key: number]: boolean }>({});

    useFocusEffect(
        useCallback(() => {
            fetchProjects();
        }, [])
    );

    // 1. Fetch MAIN Report (Company, Milestones, All Financials initially)
    useFocusEffect(
        useCallback(() => {
            fetchReportData();
        }, [fromDate, toDate])
    );

    // 2. Fetch/Update FINANCIALS when Project Filter Changes
    useFocusEffect(
        useCallback(() => {
            if (reportData) { // Only if report is loaded
                fetchFinancials();
            }
        }, [selectedProject, reportData])
    );

    const fetchProjects = async () => {
        try {
            const response = await api.get('/sites');
            setProjects(response.data.sites || []);
        } catch (error) {
            console.error('Error fetching sites:', error);
        }
    };

    const fetchReportData = async () => {
        setLoading(true);
        try {
            let query = '';
            const params = [];
            if (fromDate && toDate) {
                params.push(`fromDate=${fromDate.toISOString().split('T')[0]}`);
                params.push(`toDate=${toDate.toISOString().split('T')[0]}`);
            }
            // NOTE: Global report does NOT use projectIds anymore (unless we want to filtering everything)
            // The user wanted "Global" stats everywhere.

            if (params.length > 0) {
                query = `?${params.join('&')}`;
            }
            const response = await api.get(`/admin/overall-report${query}`);
            setReportData(response.data);

            // Initialize Financial Data with Global Data if no project selected
            if (!selectedProject) {
                setFinancialData(response.data.financialSummary);
            }
        } catch (error) {
            console.error('Error fetching report:', error);
            Alert.alert('Error', 'Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const fetchFinancials = async () => {
        if (!selectedProject) {
            // Reset to Global Financials from main report
            if (reportData) setFinancialData(reportData.financialSummary);
            return;
        }

        try {
            // Fetch filtered report just to extract financials
            let query = `?projectIds=${selectedProject.id}`;
            if (fromDate && toDate) {
                query += `&fromDate=${fromDate.toISOString().split('T')[0]}&toDate=${toDate.toISOString().split('T')[0]}`;
            }

            const response = await api.get(`/admin/overall-report${query}`);
            setFinancialData(response.data.financialSummary);
        } catch (error) {
            console.error('Error fetching project financials:', error);
        }
    };

    const toggleProject = (projectId: number) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    const handleDownloadPDF = async () => {
        if (!reportData) return;
        try {
            const html = generateReportHTML(reportData, financialData);
            if (Platform.OS === 'web') {
                // @ts-ignore - manual iframe printing for web to avoid printing full UI
                const iframe = document.createElement('iframe');
                iframe.style.position = 'absolute';
                iframe.style.width = '0px';
                iframe.style.height = '0px';
                iframe.style.border = 'none';
                // @ts-ignore
                document.body.appendChild(iframe);

                const iframeDoc = iframe.contentWindow?.document;
                if (iframeDoc) {
                    iframeDoc.open();
                    iframeDoc.write(html);
                    iframeDoc.close();

                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();

                    // Remove iframe after printing
                    setTimeout(() => {
                        // @ts-ignore
                        document.body.removeChild(iframe);
                    }, 1000);
                }
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    const handleDownloadCSV = async () => {
        if (!reportData) return;

        try {
            let csvContent = "Category,Metric,Value,Unit/Note\n";

            // Company Overview
            csvContent += `Company Overview,Total Projects,${reportData.companyOverview?.total_projects || 0},\n`;
            csvContent += `Company Overview,Active Projects,${reportData.companyOverview?.active_projects || 0},\n`;
            csvContent += `Company Overview,Completed Projects,${reportData.companyOverview?.completed_projects || 0},\n`;
            csvContent += `Company Overview,Total Employees,${reportData.companyOverview?.total_employees || 0},\n`;

            // Financials (Use Filtered Data if available)
            const financial = financialData || reportData.financialSummary;
            csvContent += `Financials,Total Budget,${financial?.total_allocated || 0},INR\n`;
            csvContent += `Financials,Total Expenses,${financial?.total_expenses || 0},INR\n`;
            csvContent += `Financials,Balance,${financial?.balance || 0},INR\n`;
            csvContent += `Financials,Utilization,${financial?.utilization_percentage || 0},%\n`;

            // Task Stats
            csvContent += `Tasks,Total Tasks,${reportData.taskStatistics?.total_tasks || 0},\n`;
            csvContent += `Tasks,Completed Tasks,${reportData.taskStatistics?.completed_tasks || 0},\n`;
            csvContent += `Tasks,Pending Tasks,${reportData.taskStatistics?.pending_tasks || 0},\n`;
            csvContent += `Tasks,Overdue Tasks,${reportData.taskStatistics?.overdue_tasks || 0},\n`;
            csvContent += `Tasks,Avg Completion Time,${reportData.taskStatistics?.avg_completion_time_days || 0},Days\n`;

            const fileName = `Overall_Report_${new Date().toISOString().split('T')[0]}.csv`;

            if (Platform.OS === 'web') {
                // Web specific download
                // @ts-ignore: BlobOptions type mismatch fix
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;', lastModified: Date.now() });
                // @ts-ignore: DOM access
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", fileName);
                link.style.visibility = 'hidden';
                // @ts-ignore: DOM access
                document.body.appendChild(link);
                link.click();
                // @ts-ignore: DOM access
                document.body.removeChild(link);
            } else {
                // Mobile specific download
                const fileUri = (FileSystem as any).documentDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: (FileSystem as any).EncodingType.UTF8 });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                } else {
                    Alert.alert('Success', 'Report saved (' + fileName + ')');
                }
            }
        } catch (error) {
            console.error('Error generating CSV:', error);
            Alert.alert('Error', 'Failed to generate CSV');
        }
    };

    const ProgressBar = ({ percentage, color = '#10B981', height = 8 }: { percentage: number, color?: string, height?: number }) => (
        <View style={{ height, backgroundColor: '#E5E7EB', borderRadius: height / 2, overflow: 'hidden', marginTop: 8 }}>
            <View style={{ width: `${Math.min(percentage, 100)}%`, height: '100%', backgroundColor: color }} />
        </View>
    );

    const generateReportHTML = (data: any, finData: any) => {
        const financial = finData || data.financialSummary;
        return `
            <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', sans-serif; padding: 30px; color: #333; }
                        h1 { color: #8B0000; margin-bottom: 5px; }
                        .header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 2px solid #8B0000; padding-bottom: 10px; }
                        .section { margin-bottom: 30px; page-break-inside: avoid; }
                        h2 { background: #f3f3f3; padding: 10px; border-left: 5px solid #8B0000; color: #333; font-size: 18px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .kpi-grid { display: flex; flex-wrap: wrap; gap: 10px; }
                        .kpi-card { border: 1px solid #ddd; padding: 10px; width: 30%; background: #fff; box-shadow: 2px 2px 5px rgba(0,0,0,0.05); }
                        .kpi-val { font-size: 18px; font-weight: bold; color: #8B0000; }
                        .kpi-lbl { font-size: 12px; color: #666; }
                        .risk { color: red; font-weight: bold; }
                        .status-badge { padding: 3px 6px; border-radius: 4px; font-size: 10px; color: white; }
                        .bg-green { background-color: #059669; }
                        .bg-red { background-color: #DC2626; }
                        .bg-yellow { background-color: #D97706; }
                        .bg-blue { background-color: #0369A1; }
                        .bg-gray { background-color: #374151; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Noor Construction</h1>
                            <p>Overall Company Report</p>
                        </div>
                        <div style="text-align: right;">
                            <p>Generated: ${new Date().toLocaleString()}</p>
                            <p>By: Admin</p>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Company Performance</h2>
                        <div class="kpi-grid">
                            <div class="kpi-card"><div class="kpi-val">${data.companyOverview?.total_projects || 0}</div><div class="kpi-lbl">Total Projects</div></div>
                            <div class="kpi-card"><div class="kpi-val">${data.companyOverview?.active_projects || 0}</div><div class="kpi-lbl">Active Projects</div></div>
                            <div class="kpi-card"><div class="kpi-val">${data.companyOverview?.active_employees_today || 0}</div><div class="kpi-lbl">Active Employees Today</div></div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Financial Overview ${selectedProject ? `(${selectedProject.name})` : ''}</h2>
                         <table>
                            <tr><th>Metric</th><th>Amount</th></tr>
                            <tr><td>Total Allocated Budget</td><td>₹${Number(financial?.total_allocated || 0).toLocaleString()}</td></tr>
                            <tr><td>Total Received</td><td>₹${Number(financial?.total_received || 0).toLocaleString()}</td></tr>
                            <tr><td>Total Expenses</td><td>₹${Number(financial?.total_expenses || 0).toLocaleString()}</td></tr>
                             <tr><td><strong>Balance</strong></td><td class="${(financial?.balance || 0) < 0 ? 'risk' : ''}"><strong>₹${Number(financial?.balance || 0).toLocaleString()}</strong></td></tr>
                        </table>
                    </div>

                    <div class="section">
                        <h2>Milestones Summary</h2>
                        <div class="kpi-grid">
                            <div class="kpi-card"><div class="kpi-val">${data.milestones?.stats?.total || 0}</div><div class="kpi-lbl">Total</div></div>
                            <div class="kpi-card"><div class="kpi-val" style="color:#059669">${data.milestones?.stats?.completed || 0}</div><div class="kpi-lbl">Completed</div></div>
                            <div class="kpi-card"><div class="kpi-val" style="color:#DC2626">${data.milestones?.stats?.delayed || 0}</div><div class="kpi-lbl">Delayed</div></div>
                        </div>
                        <table>
                            <thead><tr><th>Milestone</th><th>Project</th><th>Status</th><th>Target/Achieved</th></tr></thead>
                            <tbody>
                                ${(data.milestones?.list || []).map((m: any) => {
            const progress = m.progress || 0;
            let dStatus = 'Not Started';

            // TRUST DB STATUS Explicitly (Fix for user issue)
            if (m.status && m.status.toLowerCase() === 'completed') {
                dStatus = 'Completed';
            } else {
                if (progress === 100) dStatus = 'Completed';
                else if (progress > 0) dStatus = 'Started';
            }

            const isDel = m.status === 'Delayed' || (dStatus !== 'Completed' && m.is_delayed);

            // Date Formatting for PDF
            const dateStr = dStatus === 'Completed' ? (m.actual_completion_date || m.derived_completion_date || m.updated_at) : m.planned_end_date;
            const formattedDate = formatDateSafe(dateStr);

            return `
                                    <tr>
                                        <td>${m.name}</td>
                                        <td>${m.site_name}</td>
                                        <td>
                                            <span class="status-badge ${dStatus === 'Completed' ? 'bg-green' : isDel ? 'bg-red' : dStatus === 'Started' ? 'bg-blue' : 'bg-gray'}" style="${dStatus === 'Started' ? 'background-color:#E0F2FE;color:#0369A1' : isDel ? 'background-color:#FEE2E2;color:#991B1B' : ''}">
                                                ${isDel ? 'DELAYED' : dStatus.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>${formattedDate}</td>
                                    </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="section">
                        <h2>Project Status</h2>
                        <table>
                            <thead><tr><th>Project</th><th>Status</th><th>Progress</th><th>Budget</th></tr></thead>
                            <tbody>
                                ${(data.projectSummary || []).map((p: any) => `
                                    <tr>
                                        <td>${p.name}</td>
                                        <td>${(p.status || '').toUpperCase()}</td>
                                        <td>${p.progress}%</td>
                                        <td>₹${Number(p.budget || 0).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Overall Report</Text>
                <TouchableOpacity onPress={handleDownloadPDF} style={styles.iconBtn}>
                    <Ionicons name="document-text-outline" size={24} color="#8B0000" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDownloadCSV} style={styles.iconBtn}>
                    <Ionicons name="download-outline" size={24} color="#059669" />
                </TouchableOpacity>
            </View>

            <View style={styles.filterRow}>
                <TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.dateBtn}>
                    <Text style={styles.dateText}>{fromDate ? fromDate.toLocaleDateString() : 'From Date'}</Text>
                    <Ionicons name="calendar" size={16} color="#666" />
                </TouchableOpacity>

                <Text>-</Text>

                <TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.dateBtn}>
                    <Text style={styles.dateText}>{toDate ? toDate.toLocaleDateString() : 'To Date'}</Text>
                    <Ionicons name="calendar" size={16} color="#666" />
                </TouchableOpacity>

                {(fromDate || toDate) && (
                    <TouchableOpacity onPress={() => { setFromDate(null); setToDate(null); }} style={styles.clearBtn}>
                        <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                )}

            </View>

            <CustomDatePicker
                visible={showFromPicker}
                onClose={() => setShowFromPicker(false)}
                onSelect={(date) => setFromDate(date)}
                selectedDate={fromDate}
                title="Select From Date"
            />

            <CustomDatePicker
                visible={showToPicker}
                onClose={() => setShowToPicker(false)}
                onSelect={(date) => setToDate(date)}
                selectedDate={toDate}
                title="Select To Date"
            />

            <Modal visible={showProjectPicker} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Filter by Project</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            <TouchableOpacity onPress={() => { setSelectedProject(null); setShowProjectPicker(false); }}>
                                <Text style={[styles.projectOption, !selectedProject && styles.selectedOption]}>All Projects</Text>
                            </TouchableOpacity>
                            {projects.map((p: any) => (
                                <TouchableOpacity key={p.id} onPress={() => { setSelectedProject(p); setShowProjectPicker(false); }}>
                                    <Text style={[styles.projectOption, selectedProject?.id === p.id && styles.selectedOption]}>{p.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setShowProjectPicker(false)} style={styles.closeButton}>
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>




            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. Company Performance Summary */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Company Performance</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kpiScroll}>
                    <KpiCard label="Total Projects" value={reportData.companyOverview.total_projects} icon="business" color="#4F46E5" />
                    <KpiCard label="Active Projects" value={reportData.companyOverview.active_projects} icon="construct" color="#059669" />
                    <KpiCard label="Completed" value={reportData.companyOverview.completed_projects} icon="checkmark-circle" color="#10B981" />
                    <KpiCard label="Employees Active" value={reportData.companyOverview.active_employees_today} icon="people" color="#F59E0B" />
                </ScrollView>

                {/* 1.5. Milestones Summary (NEW) */}
                <Text style={styles.sectionTitle}>Milestones Summary</Text>
                <View style={styles.card}>
                    {/* Stats Row */}
                    <View style={styles.row}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.statBig}>{reportData.milestones?.stats?.total || 0}</Text>
                            <Text style={styles.statLabel}>Total</Text>
                        </View>
                        <View style={{ borderLeftWidth: 1, borderColor: '#eee', paddingLeft: 15, alignItems: 'center' }}>
                            <Text style={[styles.statBig, { color: '#059669' }]}>{reportData.milestones?.stats?.completed || 0}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                        <View style={{ borderLeftWidth: 1, borderColor: '#eee', paddingLeft: 15, alignItems: 'center' }}>
                            <Text style={[styles.statBig, { color: '#DC2626' }]}>{reportData.milestones?.stats?.delayed || 0}</Text>
                            <Text style={styles.statLabel}>Delayed</Text>
                        </View>
                        <View style={{ borderLeftWidth: 1, borderColor: '#eee', paddingLeft: 15, alignItems: 'center' }}>
                            <Text style={[styles.statBig, { color: '#065F46', fontSize: 16, marginTop: 4 }]}>
                                {formatDateSafe(reportData.milestones?.stats?.latest_achievement_date)}
                            </Text>
                            <Text style={styles.statLabel}>Last Achievement</Text>
                        </View>
                    </View>

                    {/* Milestone List Table */}
                    <View style={{ marginTop: 20 }}>
                        <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                            <Text style={{ flex: 2, fontSize: 12, fontWeight: 'bold', color: '#374151' }}>Milestone</Text>
                            <Text style={{ flex: 2, fontSize: 12, fontWeight: 'bold', color: '#374151' }}>Project</Text>
                            <Text style={{ flex: 1.5, fontSize: 12, fontWeight: 'bold', color: '#374151' }}>Status</Text>
                            <Text style={{ flex: 1.5, fontSize: 12, fontWeight: 'bold', color: '#374151', textAlign: 'right' }}>Target</Text>
                        </View>
                        {reportData.milestones?.list && reportData.milestones.list.length > 0 ? (
                            reportData.milestones.list.map((m: any, index: number) => {
                                // Derive Status Logic (matching MilestoneList.tsx but safer)
                                const progress = m.progress || 0;
                                let derivedStatus = 'Not Started';

                                // TRUST DB STATUS Explicitly
                                if (m.status && m.status.toLowerCase() === 'completed') {
                                    derivedStatus = 'Completed';
                                } else {
                                    if (progress === 100) derivedStatus = 'Completed';
                                    else if (progress > 0) derivedStatus = 'Started';
                                }

                                // Delayed Logic
                                const isDelayed = m.is_delayed; // Backend calculated or check date here
                                // If status is Completed, it's never Delayed in UI (though backend might flag it)
                                const displayDelayed = derivedStatus !== 'Completed' && isDelayed;

                                let statusColor = '#1E40AF';
                                let statusBg = '#DBEAFE';
                                if (derivedStatus === 'Completed') { statusColor = '#065F46'; statusBg = '#D1FAE5'; }
                                else if (derivedStatus === 'Started') { statusColor = '#0369A1'; statusBg = '#E0F2FE'; } // Distinct blue for Started
                                else { statusColor = '#374151'; statusBg = '#F3F4F6'; } // Gray for Not Started

                                if (displayDelayed) { statusColor = '#991B1B'; statusBg = '#FEE2E2'; }

                                return (
                                    <View key={index} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                                        <Text style={{ flex: 2, fontSize: 12, color: '#1F2937' }} numberOfLines={1}>{m.name}</Text>
                                        <Text style={{ flex: 2, fontSize: 12, color: '#6B7280' }} numberOfLines={1}>{m.site_name}</Text>
                                        <View style={{ flex: 1.5 }}>
                                            <View style={{
                                                backgroundColor: statusBg,
                                                paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start'
                                            }}>
                                                <Text style={{
                                                    fontSize: 10, fontWeight: 'bold',
                                                    color: statusColor
                                                }}>
                                                    {displayDelayed ? 'DELAYED' : derivedStatus.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={{ flex: 1.5, fontSize: 11, color: '#374151', textAlign: 'right' }}>
                                            {derivedStatus === 'Completed'
                                                ? `Achieved: ${formatDateSafe(m.actual_completion_date || m.derived_completion_date || m.updated_at)}`
                                                : `Target: ${formatDateSafe(m.planned_end_date)}`
                                            }
                                        </Text>
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 10, fontSize: 12 }}>No Data Available</Text>
                        )}
                    </View>
                </View>

                {/* 2. Financial Overview */}
                <View style={[styles.sectionHeader, { justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={styles.sectionTitle}>Financial Overview</Text>

                    <TouchableOpacity onPress={() => setShowProjectPicker(true)} style={[styles.dateBtn, selectedProject && { backgroundColor: '#EFF6FF', borderColor: '#3B82F6', paddingVertical: 4, paddingHorizontal: 8 }]}>
                        <Ionicons name="filter" size={14} color={selectedProject ? '#2563EB' : '#666'} />
                        <Text style={[styles.dateText, { fontSize: 11 }, selectedProject && { color: '#1E40AF', fontWeight: 'bold' }]}>
                            {selectedProject ? (selectedProject.name.length > 15 ? selectedProject.name.slice(0, 15) + '...' : selectedProject.name) : 'Filter Project'}
                        </Text>
                        {selectedProject && (
                            <TouchableOpacity onPress={() => setSelectedProject(null)} style={{ marginLeft: 6 }}>
                                <Ionicons name="close-circle" size={14} color="#2563EB" />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>

                {financialData ? (
                    <View style={styles.card}>
                        <View style={styles.finRow}>
                            <View style={styles.finItem}>
                                <Text style={styles.finLabel}>Total Budget</Text>
                                <Text style={styles.finValue}>₹{Number(financialData.total_allocated).toLocaleString()}</Text>
                            </View>
                            <View style={styles.finItem}>
                                <Text style={styles.finLabel}>Utilization</Text>
                                <Text style={styles.finValue}>{financialData.utilization_percentage}%</Text>
                            </View>
                        </View>
                        <View style={{ marginVertical: 10, paddingHorizontal: 4 }}>
                            <ProgressBar
                                percentage={Number(financialData.utilization_percentage)}
                                color={Number(financialData.utilization_percentage) > 100 ? '#EF4444' : Number(financialData.utilization_percentage) > 85 ? '#F59E0B' : '#10B981'}
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>0%</Text>
                                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>100%</Text>
                            </View>
                        </View>
                        <View style={[styles.finRow, { marginTop: 15 }]}>
                            <View style={styles.finItem}>
                                <Text style={styles.finLabel}>Total Received</Text>
                                <Text style={[styles.finValue, { color: '#059669' }]}>₹{Number(financialData.total_received).toLocaleString()}</Text>
                            </View>
                            <View style={styles.finItem}>
                                <Text style={styles.finLabel}>Total Expenses</Text>
                                <Text style={[styles.finValue, { color: '#DC2626' }]}>₹{Number(financialData.total_expenses).toLocaleString()}</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.finRow}>
                            <Text style={styles.balanceLabel}>Remaining Balance</Text>
                            <Text style={[styles.balanceValue, { color: financialData.balance < 0 ? '#DC2626' : '#10B981' }]}>
                                ₹{Number(financialData.balance).toLocaleString()}
                            </Text>
                        </View>
                        {financialData.over_budget_projects_count > 0 && !selectedProject && (
                            <View style={styles.alertBox}>
                                <MaterialIcons name="error-outline" size={20} color="#B91C1C" />
                                <Text style={styles.alertText}>{financialData.over_budget_projects_count} Project(s) Over Budget</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={[styles.card, { padding: 20, alignItems: 'center' }]}>
                        <ActivityIndicator size="small" color="#8B0000" />
                    </View>
                )}

                {/* 3. Project-Wise Detailed Status */}
                <Text style={styles.sectionTitle}>{fromDate && toDate ? "Project Activity (Selected Period)" : "Project Status"}</Text>
                {reportData.projectSummary.map((project: any) => (
                    <View key={project.id} style={styles.projectCard}>
                        <TouchableOpacity style={styles.projectHeader} onPress={() => toggleProject(project.id)}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={styles.projectName}>{project.name}</Text>
                                        <Text style={styles.projectLoc}>{project.location}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        {/* In Date Mode, hide "Active" badge if it's confusing, or show Period Stats? */}
                                        {/* User wants "Date Wise Report", so maybe show "Tasks: X" as the hero number */}
                                        {fromDate && toDate ? (
                                            <View>
                                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#374151', textAlign: 'right' }}>
                                                    {project.completed_tasks} Task{project.completed_tasks !== 1 ? 's' : ''}
                                                </Text>
                                                <Text style={{ fontSize: 10, color: '#6B7280' }}>Completed</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <StatusBadge status={project.status} />
                                                <Text style={styles.projectProgress}>{project.progress}%</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                                <View style={{ marginTop: 8 }}>
                                    {/* Hide Overall Bar in Date Mode to prevent "100%" confusion */}
                                    {!(fromDate && toDate) && (
                                        <ProgressBar
                                            percentage={project.progress}
                                            color={project.progress >= 100 ? '#059669' : '#2563EB'}
                                            height={6}
                                        />
                                    )}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                        {fromDate && toDate ? (
                                            <>
                                                <Text style={{ fontSize: 11, color: '#6B7280' }}>Status: {project.status.toUpperCase()}</Text>
                                                <Text style={{ fontSize: 11, color: '#374151', fontWeight: '500' }}>Overall Progress: {project.progress}%</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={{ fontSize: 10, color: '#6B7280' }}>Overall Progress</Text>
                                                <Text style={{ fontSize: 11, color: '#374151', fontWeight: '500' }}>Completed (Period): {project.completed_tasks}/{project.total_tasks}</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                            </View>
                            <Ionicons name={expandedProjects[project.id] ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" style={{ marginLeft: 12, alignSelf: 'center' }} />
                        </TouchableOpacity>

                        {/* Expanded Details */}
                        {expandedProjects[project.id] && (
                            <View style={styles.projectDetails}>
                                <View style={styles.detailRow}>
                                    <DetailItem label="Tasks Done" value={`${project.completed_tasks}/${project.total_tasks}`} />
                                    <DetailItem label="Pending Approval" value={project.pending_approvals} color="#F59E0B" />
                                </View>

                                <Text style={styles.subHeader}>Phases</Text>
                                {reportData.phaseSummary.filter((ph: any) => ph.site_id === project.id).map((phase: any) => (
                                    <View key={phase.id} style={styles.phaseRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.phaseName}>{phase.name}</Text>
                                            <Text style={styles.phaseBudget}>Bud: ₹{Number(phase.budget).toLocaleString()} | Used: ₹{Number(phase.amount_used).toLocaleString()}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.phaseStatus, { color: phase.is_over_budget ? '#DC2626' : '#059669' }]}>
                                                {phase.progress}%
                                            </Text>
                                            {phase.pending_approvals > 0 && (
                                                <Text style={{ fontSize: 10, color: '#D97706' }}>{phase.pending_approvals} Appr. Pend.</Text>
                                            )}
                                        </View>
                                    </View>

                                ))}

                                <TouchableOpacity
                                    style={{
                                        marginTop: 12,
                                        backgroundColor: '#E0E7FF',
                                        padding: 10,
                                        borderRadius: 8,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center',
                                        gap: 8
                                    }}
                                    onPress={() => navigation.navigate('EmployeeProjectDetails', { siteId: project.id, siteName: project.name })}
                                >
                                    <Text style={{ color: '#3730A3', fontWeight: '600', fontSize: 13 }}>View Full Dashboard</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#3730A3" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))
                }

                {/* 5. Task Analytics */}
                <Text style={styles.sectionTitle}>Task Analytics</Text>
                <View style={[styles.card, styles.gridCard]}>
                    <StatBox label="Total" value={reportData.taskStatistics.total_tasks} />
                    <StatBox label="Completed" value={reportData.taskStatistics.completed_tasks} color="#059669" />
                    <StatBox label="Pending" value={reportData.taskStatistics.pending_tasks} color="#6B7280" />
                    <StatBox label="Approved" value={reportData.taskStatistics.waiting_approval} color="#D97706" />
                    <StatBox label="Overdue" value={reportData.taskStatistics.overdue_tasks} color="#DC2626" />
                    <StatBox label="Avg (Days)" value={reportData.taskStatistics.avg_completion_time_days} />
                    <View style={{ width: '100%', marginTop: 15, paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Completion Rate</Text>
                        <ProgressBar
                            percentage={reportData.taskStatistics.total_tasks > 0 ? (reportData.taskStatistics.completed_tasks / reportData.taskStatistics.total_tasks) * 100 : 0}
                            color="#3B82F6"
                        />
                    </View>
                </View>

                {/* 6. Material Overview */}
                <Text style={styles.sectionTitle}>Materials & Resources</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.statBig}>{reportData.materialOverview.total_requests}</Text>
                            <Text style={styles.statLabel}>Total Requests</Text>
                        </View>
                        <View style={{ borderLeftWidth: 1, borderColor: '#eee', paddingLeft: 15 }}>
                            <Text style={[styles.statBig, { color: '#059669' }]}>{reportData.materialOverview.delivered_requests}</Text>
                            <Text style={styles.statLabel}>Delivered</Text>
                        </View>
                        <View style={{ borderLeftWidth: 1, borderColor: '#eee', paddingLeft: 15 }}>
                            <Text style={[styles.statBig, { color: '#D97706' }]}>{reportData.materialOverview.pending_requests}</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                    </View>

                </View>

                {/* 7. Employee Performance */}
                <Text style={styles.sectionTitle}>Employee Performance</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, paddingHorizontal: 16 }}>
                    {reportData.employeePerformance.map((emp: any) => (
                        <View key={emp.id} style={styles.empCard}>
                            <View style={styles.empHeader}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{emp.name.substring(0, 1)}</Text>
                                </View>
                                <View>
                                    <Text style={styles.empName}>{emp.name}</Text>
                                    <Text style={styles.empRole}>{emp.role}</Text>
                                </View>
                            </View>
                            <View style={styles.empStats}>
                                <Text style={styles.esLabel}>Tasks: {emp.completed_tasks}/{emp.assigned_tasks}</Text>
                                <Text style={styles.esLabel}>Overdue: <Text style={{ color: emp.overdue_tasks > 0 ? 'red' : '#666' }}>{emp.overdue_tasks}</Text></Text>
                            </View>
                            <View style={[styles.perfBadge, { backgroundColor: emp.performance_status === 'Good' ? '#D1FAE5' : emp.performance_status === 'Average' ? '#FEF3C7' : '#FEE2E2' }]}>
                                <Text style={{ fontSize: 10, color: emp.performance_status === 'Good' ? '#065F46' : emp.performance_status === 'Average' ? '#92400E' : '#991B1B' }}>
                                    {(emp.performance_status || 'Poor').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>





                <View style={{ height: 50 }} />
            </ScrollView >
        </View >
    );
};

// Helper Components
const KpiCard = ({ label, value, icon, color, isAlert }: any) => (
    <View style={[styles.kpiCard, isAlert && { borderColor: color, borderWidth: 1 }]}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiLabel}>{label}</Text>
    </View>
);

const DetailItem = ({ label, value, color = '#374151' }: any) => (
    <View style={{ alignItems: 'center' }}>
        <Text style={[styles.detailVal, { color }]}>{value}</Text>
        <Text style={styles.detailLbl}>{label}</Text>
    </View>
);

const StatusBadge = ({ status }: any) => {
    let color = '#6B7280';
    let bg = '#F3F4F6';
    if (status === 'active') { color = '#059669'; bg = '#D1FAE5'; }
    if (status === 'completed') { color = '#2563EB'; bg = '#DBEAFE'; }
    if (status === 'delayed') { color = '#DC2626'; bg = '#FEE2E2'; }
    return (
        <View style={[styles.badge, { backgroundColor: bg }]}>
            <Text style={{ color, fontSize: 10, fontWeight: 'bold' }}>{status.toUpperCase()}</Text>
        </View>
    );
};

const StatBox = ({ label, value, color = '#111827' }: any) => (
    <View style={styles.statBox}>
        <Text style={[styles.statBoxVal, { color }]}>{value}</Text>
        <Text style={styles.statBoxLbl}>{label}</Text>
    </View>
);

const AuditItem = ({ label, value }: any) => (
    <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{value}</Text>
        <Text style={{ fontSize: 11, color: '#666', textAlign: 'center' }}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingTop: 50 },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    iconBtn: { padding: 4 },
    content: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 20, marginBottom: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

    kpiScroll: { marginHorizontal: -16, paddingHorizontal: 16, paddingBottom: 10 },
    kpiCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginRight: 12, width: 140, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    kpiValue: { fontSize: 22, fontWeight: 'bold', color: '#1F2937' },
    kpiLabel: { fontSize: 12, color: '#6B7280' },

    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 1 },
    finRow: { flexDirection: 'row', justifyContent: 'space-between' },
    finItem: { flex: 1 },
    finLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
    finValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
    divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
    balanceLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
    balanceValue: { fontSize: 20, fontWeight: 'bold' },
    alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', padding: 8, borderRadius: 8, marginTop: 12 },
    alertText: { color: '#B91C1C', fontSize: 12, marginLeft: 6, fontWeight: '500' },

    projectCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 1 },
    projectHeader: { flexDirection: 'row', padding: 16, alignItems: 'center' },
    projectName: { fontSize: 16, fontWeight: '600', color: '#111827' },
    projectLoc: { fontSize: 12, color: '#6B7280' },
    projectProgress: { fontSize: 12, color: '#059669', fontWeight: 'bold', marginTop: 2 },
    badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },

    projectDetails: { backgroundColor: '#F9FAFB', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    detailVal: { fontSize: 14, fontWeight: 'bold' },
    detailLbl: { fontSize: 11, color: '#6B7280' },
    subHeader: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
    phaseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    phaseName: { fontSize: 13, color: '#1F2937' },
    phaseBudget: { fontSize: 11, color: '#6B7280' },
    phaseStatus: { fontSize: 12, fontWeight: 'bold' },

    gridCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
    statBox: { width: '30%', alignItems: 'center', paddingVertical: 8 },
    statBoxVal: { fontSize: 18, fontWeight: 'bold' },
    statBoxLbl: { fontSize: 11, color: '#6B7280' },

    row: { flexDirection: 'row', justifyContent: 'space-around' },
    statBig: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    statLabel: { fontSize: 12, color: '#6B7280' },

    empCard: { width: 160, backgroundColor: '#fff', padding: 12, borderRadius: 12, marginRight: 12, elevation: 1 },
    empHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarText: { color: '#fff', fontWeight: 'bold' },
    empName: { fontSize: 13, fontWeight: '600', color: '#1F2937', width: 90 },
    empRole: { fontSize: 10, color: '#6B7280' },
    empStats: { marginBottom: 8 },
    esLabel: { fontSize: 11, color: '#4B5563', marginBottom: 2 },
    perfBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

    riskRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    riskText: { marginLeft: 8, fontSize: 13, color: '#374151' },

    lastAction: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10 },

    filterRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
    dateBtn: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E5E7EB' },
    dateText: { fontSize: 13, color: '#374151' },
    clearBtn: { backgroundColor: '#9CA3AF', padding: 4, borderRadius: 10 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', maxHeight: '60%', backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15, textAlign: 'center' },
    projectOption: { paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', fontSize: 16, color: '#374151' },
    selectedOption: { color: '#2563EB', fontWeight: 'bold', backgroundColor: '#EFF6FF' },
    closeButton: { marginTop: 15, backgroundColor: '#8B0000', padding: 12, borderRadius: 8, alignItems: 'center' },
    closeButtonText: { color: '#fff', fontWeight: 'bold' }
});

export default OverallReportScreen;
