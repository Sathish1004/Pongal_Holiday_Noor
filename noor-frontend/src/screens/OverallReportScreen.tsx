import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import api from '../services/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import CustomDatePicker from '../components/CustomDatePicker';

// Silence TypeScript error for web-only code
declare const document: any;

// --- Types ---
interface ReportData {
    generatedAt: string;
    companyOverview: { total_projects: number; active_projects: number; completed_projects: number; projects_with_delays: number; active_employees_today: number; };
    financialSummary: { total_allocated: number; total_expenses: number; total_received: number; balance: number; utilization_percentage: string | number; };
    projectSummary: any[];
    milestones: { stats: any; list: any[]; achievements: string[] };
    taskStatistics: any;
    employeePerformance: EmployeeStats[];
    actionItems: string[];
    topExpenseProjects: any[];
}

interface EmployeeStats {
    id: number;
    name: string;
    role: string;
    status: string;
    assigned_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
    on_time_tasks: number;
    avg_completion_days: string | number;
    rejection_count: number;
    last_activity: string | null;
    performance_score: number;
}

// --- Components ---

const DetailItem = ({ label, value, color }: { label: string, value: string | number, color?: string }) => (
    <View style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: '#6B7280' }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: color || '#1F2937' }}>{value}</Text>
    </View>
);

const KpiCard = ({ label, value, icon, color, subLabel }: { label: string, value: number | string, icon: any, color: string, subLabel?: string }) => (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
        <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ marginLeft: 10 }}>
            <Text style={styles.kpiValue}>{value}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
            {subLabel && <Text style={{ fontSize: 10, color: '#DC2626', fontWeight: '500' }}>{subLabel}</Text>}
        </View>
    </View>
);

const ProjectHealthCard = ({ project }: { project: any }) => {
    let statusColor = '#10B981'; // Green
    let statusIcon = 'checkmark-circle';

    if (project.status === 'delayed' || project.days_behind !== '0') {
        statusColor = '#EF4444'; // Red
        statusIcon = 'alert-circle';
    } else if (project.status === 'at_risk' || project.pending_approvals > 0) {
        statusColor = '#F59E0B'; // Yellow
        statusIcon = 'warning';
    }

    return (
        <View style={styles.projectCardCompact}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View>
                    <Text style={styles.projName}>{project.name}</Text>
                    <Text style={styles.projLoc}>{project.location}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name={statusIcon as any} size={16} color={statusColor} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: statusColor }}>
                        {project.status === 'delayed' ? 'Delayed' : project.status === 'completed' ? 'Completed' : 'On Track'}
                    </Text>
                </View>
            </View>

            {/* Progress */}
            <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 10, color: '#666' }}>Progress</Text>
                    <Text style={{ fontSize: 10, fontWeight: 'bold' }}>{project.progress}%</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 }}>
                    <View style={{ width: `${project.progress}%`, height: '100%', backgroundColor: statusColor, borderRadius: 3 }} />
                </View>
            </View>

            {/* Quick Stats */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: '#4B5563' }}><Text style={{ fontWeight: 'bold' }}>{project.pending_approvals}</Text> Pending Actions</Text>
            </View>
        </View>
    );
};

const getPerformanceRating = (emp: EmployeeStats) => {
    if (emp.assigned_tasks === 0) return { label: 'Inactive', color: '#9CA3AF', icon: 'remove-circle' };

    const score = emp.performance_score;
    const hasDelays = emp.overdue_tasks > 0;
    const hasRejections = emp.rejection_count > 0;

    if (score >= 90 && !hasDelays && !hasRejections) return { label: 'Excellent', color: '#10B981', icon: 'star' };
    if (score >= 75 && !hasDelays) return { label: 'Good', color: '#3B82F6', icon: 'thumbs-up' };
    if (score >= 50) return { label: 'Average', color: '#F59E0B', icon: 'alert-circle' };
    return { label: 'Poor', color: '#EF4444', icon: 'warning' };
};

const EmployeePerformanceCard = ({ employee }: { employee: EmployeeStats }) => {
    const rating = getPerformanceRating(employee);

    return (
        <View style={styles.empRow}>
            {/* Left: Info */}
            <View style={{ width: '30%' }}>
                <Text style={styles.empNameCompact}>{employee.name}</Text>
                <Text style={styles.empRoleCompact}>{employee.role}</Text>
            </View>

            {/* Middle: Stats */}
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                <View style={styles.statCompact}>
                    <Text style={styles.statValCompact}>{employee.assigned_tasks}</Text>
                    <Text style={styles.statLblCompact}>Assigned</Text>
                </View>
                <View style={styles.statCompact}>
                    <Text style={[styles.statValCompact, { color: '#059669' }]}>{employee.completed_tasks}</Text>
                    <Text style={styles.statLblCompact}>Done</Text>
                </View>
                <View style={styles.statCompact}>
                    <Text style={[styles.statValCompact, { color: '#D97706' }]}>{employee.pending_tasks}</Text>
                    <Text style={styles.statLblCompact}>Pending</Text>
                </View>
                <View style={styles.statCompact}>
                    <Text style={[styles.statValCompact, { color: '#DC2626' }]}>{employee.overdue_tasks}</Text>
                    <Text style={styles.statLblCompact}>Overdue</Text>
                </View>
            </View>

            {/* Right: Rating */}
            <View style={{ width: '20%', alignItems: 'flex-end', justifyContent: 'center' }}>
                <View style={[styles.ratingBadge, { backgroundColor: rating.color + '20', paddingVertical: 2, paddingHorizontal: 6 }]}>
                    <Ionicons name={rating.icon as any} size={10} color={rating.color} style={{ marginRight: 3 }} />
                    <Text style={[styles.ratingText, { color: rating.color, fontSize: 10 }]}>{rating.label}</Text>
                </View>
                {employee.rejection_count > 0 && (
                    <Text style={{ fontSize: 9, color: '#EF4444', marginTop: 2 }}>{employee.rejection_count} Rejections</Text>
                )}
            </View>
        </View>
    );
};

const ActionItem = ({ text }: { text: string }) => (
    <View style={styles.actionItem}>
        <MaterialIcons name="error" size={18} color="#DC2626" />
        <Text style={styles.actionText}>{text}</Text>
    </View>
);

// --- Main Screen ---

const OverallReportScreen = ({ navigation }: any) => {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<ReportData | null>(null);
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    // Project Filter
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState<any | null>(null);
    const [showProjectPicker, setShowProjectPicker] = useState(false);

    // Employee Filter State
    const [sortBy, setSortBy] = useState<'best' | 'overdue' | 'inactive'>('best');

    const getSortedEmployees = useCallback(() => {
        if (!report?.employeePerformance) return [];
        let filtered = report.employeePerformance;

        return [...filtered].sort((a, b) => {
            if (sortBy === 'best') return b.performance_score - a.performance_score; // Highest score first
            if (sortBy === 'overdue') return b.overdue_tasks - a.overdue_tasks; // Most overdue first
            if (sortBy === 'inactive') return (a.completed_tasks) - (b.completed_tasks); // Least completed first
            return 0;
        });
    }, [report, sortBy]);

    useFocusEffect(useCallback(() => { fetchProjects(); }, []));
    useFocusEffect(useCallback(() => { fetchReport(); }, [fromDate, toDate, selectedProject]));

    const fetchProjects = async () => {
        try {
            const res = await api.get('/sites');
            setProjects(res.data.sites || []);
        } catch (e) { console.error(e); }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            let q = '';
            const p = [];
            if (fromDate && toDate) {
                p.push(`fromDate=${fromDate.toISOString().split('T')[0]}`);
                p.push(`toDate=${toDate.toISOString().split('T')[0]}`);
            }
            if (selectedProject) {
                p.push(`projectIds=${selectedProject.id}`);
            }
            if (p.length > 0) q = `?${p.join('&')}`;

            const res = await api.get(`/admin/overall-report${q}`);
            setReport(res.data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load report');
        } finally {
            setLoading(false);
        }
    };

    // --- PDF & CSV Handlers ---
    const generateHTML = () => {
        if (!report) return '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; }
                    
                    /* Header */
                    .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                    .header-left h1 { color: #8B0000; font-size: 28px; margin: 0; font-weight: bold; }
                    .header-left p { margin: 5px 0 0; font-size: 14px; color: #555; }
                    .header-right { text-align: right; font-size: 12px; color: #444; line-height: 1.5; }
                    
                    .divider { border-bottom: 2px solid #8B0000; margin-bottom: 30px; }
                    
                    /* Section Headers */
                    .section-title { 
                        font-size: 16px; 
                        font-weight: bold; 
                        color: #333; 
                        border-left: 5px solid #8B0000; 
                        padding-left: 10px; 
                        margin: 30px 0 20px 0;
                    }
                    
                    /* Company Performance Cards */
                    .kpi-row { display: flex; gap: 20px; margin-bottom: 10px; }
                    .kpi-card { 
                        border: 1px solid #ddd; 
                        padding: 15px; 
                        flex: 1; 
                        background: #fff;
                    }
                    .kpi-value { font-size: 18px; font-weight: bold; color: #8B0000; display: block; margin-bottom: 5px; }
                    .kpi-label { font-size: 12px; color: #666; }

                    /* Tables */
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                    th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; }
                    th { bgackground-color: #f9fafb; font-weight: bold; color: #374151; }
                    td { color: #4b5563; }
                    
                    .font-bold { font-weight: bold; color: #111; }
                </style>
            </head>
            <body>
                <!-- Header -->
                <div class="header-container">
                    <div class="header-left">
                        <h1>Noor Construction</h1>
                        <p>Overall Company Report</p>
                    </div>
                    <div class="header-right">
                        <div>Generated: ${new Date(report.generatedAt).toLocaleString()}</div>
                        <div>By: Admin</div>
                    </div>
                </div>
                <div class="divider"></div>

                <!-- 1. Company Performance -->
                <div class="section-title">Company Performance</div>
                <div class="kpi-row">
                    <div class="kpi-card">
                        <span class="kpi-value">${report.companyOverview.total_projects}</span>
                        <span class="kpi-label">Total Projects</span>
                    </div>
                    <div class="kpi-card">
                        <span class="kpi-value">${report.companyOverview.active_projects}</span>
                        <span class="kpi-label">Active Projects</span>
                    </div>
                </div>
                <div class="kpi-row" style="width: 50% /* Adjust to look like image where 3rd is below? Or maybe user wants 3 in row? Image shows 2 top, 1 bottom or 3 grid. Let's do a flex wrap or just 2 rows based on image. Image has 2 cols. */">
                    <div class="kpi-card">
                        <span class="kpi-value">${report.companyOverview.active_employees_today || 0}</span>
                        <span class="kpi-label">Active Employees Today</span>
                    </div>
                </div>

                <!-- 2. Financial Overview -->
                <div class="section-title">Financial Overview</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 60%">Metric</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Allocated Budget</td>
                            <td class="font-bold">₹${Number(report.financialSummary.total_allocated).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Total Received</td>
                            <td class="font-bold">₹${Number(report.financialSummary.total_received).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Total Expenses</td>
                            <td class="font-bold">₹${Number(report.financialSummary.total_expenses).toLocaleString()}</td>
                        </tr>
                         <tr>
                            <td class="font-bold">Balance</td>
                            <td class="font-bold">₹${Number(report.financialSummary.balance).toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- 3. Project Status -->
                <div class="section-title">Project Status</div>
                <table>
                    <thead>
                        <tr>
                            <th>Project</th>
                            <th>Location</th>
                            <th>Status</th>
                            <th>Progress</th>
                            <th>Budget</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.projectSummary.map(p => `
                            <tr>
                                <td>${p.name}</td>
                                <td>${p.location}</td>
                                <td>${p.status.toUpperCase()}</td>
                                <td>${p.progress}%</td>
                                <td>₹${Number(p.total_allocated || p.budget).toLocaleString()}</td>
                                <td style="color: ${p.pending_approvals > 0 ? '#DC2626' : '#059669'}; font-weight: bold;">
                                    ${p.pending_approvals} Pending
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <!-- 4. Employee Performance -->
                <div class="section-title">Employee Performance</div>
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Role</th>
                            <th>Assigned</th>
                            <th>Completed</th>
                            <th>On Time (Days)</th>
                            <th>Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.employeePerformance.slice(0, 10).map(e => {
            const score = e.performance_score || 0;
            const hasDelays = e.overdue_tasks > 0;
            const hasRejections = e.rejection_count > 0;
            let rating = 'Poor';
            let color = '#EF4444';

            if (score >= 90 && !hasDelays && !hasRejections) { rating = 'Excellent'; color = '#10B981'; }
            else if (score >= 75 && !hasDelays) { rating = 'Good'; color = '#3B82F6'; }
            else if (score >= 50) { rating = 'Average'; color = '#F59E0B'; }

            return `
                            <tr>
                                <td>${e.name}</td>
                                <td>${e.role}</td>
                                <td>${e.assigned_tasks}</td>
                                <td>${e.completed_tasks}</td>
                                <td>${e.avg_completion_days}</td>
                                <td style="color: ${color}; font-weight: bold;">${rating}</td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>

            </body>
            </html>
        `;
    };

    const handleDownloadPDF = async () => {
        if (!report) return;
        try {
            const html = generateHTML();
            if (Platform.OS === 'web') {
                // Manual iframe approach to ensure only the HTML is printed, not the app UI
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.right = '0';
                iframe.style.bottom = '0';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.style.border = '0';
                document.body.appendChild(iframe);

                const doc = iframe.contentWindow?.document;
                if (doc) {
                    doc.open();
                    doc.write(html);
                    doc.close();

                    // Allow time for styles to load/render
                    setTimeout(() => {
                        iframe.contentWindow?.focus();
                        iframe.contentWindow?.print();
                        // Cleanup
                        setTimeout(() => document.body.removeChild(iframe), 2000);
                    }, 500);
                }
            } else {
                const { uri } = await Print.printToFileAsync({ html });
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    const handleDownloadCSV = async () => {
        // Placeholder for CSV - implement if needed
        Alert.alert('Info', 'CSV download not yet fully implemented for new structure');
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#8B0000" /></View>;
    if (!report) return null;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
                <Text style={styles.headerTitle}>Overall Report</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity onPress={handleDownloadPDF}><Ionicons name="document-text-outline" size={24} color="#8B0000" /></TouchableOpacity>
                    <TouchableOpacity onPress={handleDownloadCSV}><Ionicons name="download-outline" size={24} color="#059669" /></TouchableOpacity>
                </View>
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => setShowFromPicker(true)} style={styles.dateBtn}>
                        <Text style={styles.dateText}>{fromDate ? fromDate.toLocaleDateString() : 'From'}</Text>
                    </TouchableOpacity>
                    <Text>-</Text>
                    <TouchableOpacity onPress={() => setShowToPicker(true)} style={styles.dateBtn}>
                        <Text style={styles.dateText}>{toDate ? toDate.toLocaleDateString() : 'To'}</Text>
                    </TouchableOpacity>
                    {(fromDate || toDate) && <TouchableOpacity onPress={() => { setFromDate(null); setToDate(null) }}><Ionicons name="close" size={16} /></TouchableOpacity>}
                </View>

                <TouchableOpacity onPress={() => setShowProjectPicker(true)} style={styles.projectFilterBtn}>
                    <Text style={{ fontSize: 12, color: '#3B82F6', fontWeight: '500' }}>
                        {selectedProject ? selectedProject.name : 'All Projects'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* 1. Executive Summary */}
                <Text style={styles.sectionTitle}>Executive Summary</Text>
                <View style={styles.rowWrap}>
                    <KpiCard label="Active Projects" value={report.companyOverview.active_projects} icon="briefcase" color="#3B82F6" />
                    <KpiCard label="Completed" value={report.companyOverview.completed_projects} icon="checkmark-done-circle" color="#10B981" />
                    <KpiCard label="Delayed" value={report.companyOverview.projects_with_delays} icon="time" color="#EF4444" />
                    <KpiCard label="Budget Util." value={`${report.financialSummary.utilization_percentage}%`} icon="wallet" color="#F59E0B" />
                </View>

                {/* 8. Action Required Panel (Prioritized High) */}
                {(report.actionItems && report.actionItems.length > 0) && (
                    <View style={styles.actionPanel}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                            <Text style={styles.actionTitle}>Action Required</Text>
                        </View>
                        {report.actionItems.map((item, i) => <ActionItem key={i} text={item} />)}
                    </View>
                )}

                {/* 3. Project Health Overview */}
                <Text style={styles.sectionTitle}>Project Health</Text>
                {report.projectSummary.map(p => <ProjectHealthCard key={p.id} project={p} />)}

                {/* 4. Milestones Summary */}
                <Text style={styles.sectionTitle}>Milestone Achievements</Text>
                {/* Achievement Messages Banner */}
                {report.milestones?.achievements?.length > 0 && (
                    <View style={styles.achievementBanner}>
                        {report.milestones.achievements.map((msg, i) => (
                            <Text key={i} style={styles.achievementText}>{msg}</Text>
                        ))}
                    </View>
                )}
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.statBig}>{report.milestones.stats.completed}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={styles.statBig}>{report.milestones.stats.in_progress}</Text>
                            <Text style={styles.statLabel}>Ongoing</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={[styles.statBig, { color: '#EF4444' }]}>{report.milestones.stats.delayed}</Text>
                            <Text style={styles.statLabel}>Delayed</Text>
                        </View>
                    </View>
                </View>

                {/* 5. Financial Overview */}
                <Text style={styles.sectionTitle}>Financial Overview</Text>
                <View style={styles.card}>
                    {/* Row 1: Total Budget & Utilization */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                        <View>
                            <Text style={styles.finLabel}>Total Budget</Text>
                            <Text style={[styles.finValue, { fontSize: 18 }]}>₹{Number(report.financialSummary.total_allocated).toLocaleString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.finLabel}>Utilization</Text>
                            <Text style={[styles.finValue, { fontSize: 18 }]}>{report.financialSummary.utilization_percentage}%</Text>
                        </View>
                    </View>

                    {/* Row 2: Progress Bar */}
                    <View style={{ marginBottom: 15 }}>
                        <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
                            <View style={{ width: `${Math.min(Number(report.financialSummary.utilization_percentage), 100)}%`, height: '100%', backgroundColor: Number(report.financialSummary.utilization_percentage) > 80 ? '#EF4444' : '#10B981' }} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>0%</Text>
                            <Text style={{ fontSize: 10, color: '#9CA3AF' }}>100%</Text>
                        </View>
                    </View>

                    {/* Row 3: Received & Expenses */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                        <View>
                            <Text style={styles.finLabel}>Total Received</Text>
                            <Text style={[styles.finValue, { color: '#10B981', fontSize: 16 }]}>₹{Number(report.financialSummary.total_received).toLocaleString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.finLabel}>Total Expenses</Text>
                            <Text style={[styles.finValue, { color: '#EF4444', fontSize: 16 }]}>₹{Number(report.financialSummary.total_expenses).toLocaleString()}</Text>
                        </View>
                    </View>

                    {/* Row 4: Divider & Balance */}
                    <View style={{ borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151' }}>Remaining Balance</Text>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: report.financialSummary.balance < 0 ? '#EF4444' : '#10B981' }}>
                            ₹{Number(report.financialSummary.balance).toLocaleString()}
                        </Text>
                    </View>

                    {/* Top Expenses (Keep as footer details) */}
                    {report.topExpenseProjects && report.topExpenseProjects.length > 0 && (
                        <View style={{ marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#4B5563' }}>Top Expenses by Project</Text>
                            {report.topExpenseProjects.map((p, i) => (
                                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <Text style={{ fontSize: 13, color: '#4B5563' }}>{p.name}</Text>
                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>₹{Number(p.spent).toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* 6. Task Analytics */}
                <Text style={styles.sectionTitle}>Task Analytics</Text>
                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'space-between' }}>
                        <View style={{ width: '45%' }}><DetailItem label="Total Tasks" value={report.taskStatistics.total_tasks} /></View>
                        <View style={{ width: '45%' }}><DetailItem label="Completed" value={report.taskStatistics.completed_tasks} color="#10B981" /></View>
                        <View style={{ width: '45%' }}><DetailItem label="Pending Approval" value={report.taskStatistics.waiting_approval} color="#F59E0B" /></View>
                        <View style={{ width: '45%' }}><DetailItem label="Avg Completion" value={`${report.taskStatistics.avg_completion_time_days} days`} /></View>
                    </View>
                </View>

                {/* 7. Employee Performance Grid */}
                <Text style={styles.sectionTitle}>Employee Performance</Text>

                {/* Controls */}
                <View style={[styles.card, { padding: 10 }]}>
                    {/* Sort Options */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        {[
                            { id: 'best', label: 'Best Performer' },
                            { id: 'overdue', label: 'Most Overdue' },
                            { id: 'inactive', label: 'Least Active' }
                        ].map(opt => (
                            <TouchableOpacity
                                key={opt.id}
                                onPress={() => setSortBy(opt.id as any)}
                                style={[styles.sortBtn, sortBy === opt.id && styles.sortBtnActive, { flex: 1, marginHorizontal: 2, alignItems: 'center' }]}
                            >
                                <Text style={[styles.sortBtnText, sortBy === opt.id && styles.sortBtnTextActive]}>{opt.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Cards List */}
                <View style={{ marginBottom: 20 }}>
                    {getSortedEmployees().length === 0 ? (
                        <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No employees found matching criteria.</Text>
                    ) : (
                        getSortedEmployees().map(e => (
                            <EmployeePerformanceCard key={e.id} employee={e} />
                        ))
                    )}
                </View>

                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Pickers & Modals */}
            <CustomDatePicker visible={showFromPicker} onClose={() => setShowFromPicker(false)} onSelect={setFromDate} selectedDate={fromDate} title="From Date" />
            <CustomDatePicker visible={showToPicker} onClose={() => setShowToPicker(false)} onSelect={setToDate} selectedDate={toDate} title="To Date" />
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
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    dateBtn: { backgroundColor: '#F3F4F6', padding: 6, borderRadius: 6, paddingHorizontal: 10 },
    dateText: { fontSize: 12, color: '#333' },
    projectFilterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', padding: 6, paddingHorizontal: 12, borderRadius: 20, gap: 4 },
    content: { padding: 16 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginTop: 20, marginBottom: 12 },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

    // KPI Card
    kpiCard: { width: '48%', backgroundColor: '#fff', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, elevation: 1, marginBottom: 10 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    kpiValue: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
    kpiLabel: { fontSize: 11, color: '#6B7280' },

    // Action Panel
    actionPanel: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FCA5A5', marginTop: 10 },
    actionTitle: { fontSize: 14, fontWeight: 'bold', color: '#991B1B', marginLeft: 6 },
    actionItem: { flexDirection: 'row', marginTop: 6, gap: 8 },
    actionText: { fontSize: 13, color: '#7F1D1D', flex: 1 },

    // Project Card
    projectCardCompact: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, elevation: 1 },
    projName: { fontSize: 14, fontWeight: '600', color: '#111827' },
    projLoc: { fontSize: 11, color: '#666' },

    // General
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, elevation: 1, marginBottom: 10 },
    achievementBanner: { backgroundColor: '#ECFDF5', padding: 10, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#10B981' },
    achievementText: { fontSize: 12, color: '#065F46', marginBottom: 2 },
    statBig: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    statLabel: { fontSize: 11, color: '#666' },

    // Financials
    finLabel: { fontSize: 12, color: '#6B7280' },
    finValue: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 10, padding: 20, maxHeight: '60%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    projectOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', fontSize: 14 },
    selectedOption: { backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 'bold' },
    closeButton: { marginTop: 15, alignSelf: 'center', padding: 10 },
    closeButtonText: { color: '#666' },

    // Employee Row Styles (Compact)
    empRow: {
        backgroundColor: '#fff', padding: 12, marginBottom: 8, borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
    },
    empNameCompact: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    empRoleCompact: { fontSize: 11, color: '#6B7280' },

    statCompact: { alignItems: 'center', marginHorizontal: 4 },
    statValCompact: { fontSize: 13, fontWeight: 'bold', color: '#374151' },
    statLblCompact: { fontSize: 9, color: '#9CA3AF' },

    ratingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
    ratingText: { fontSize: 10, fontWeight: '700' },

    // Controls
    sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
    sortBtnActive: { backgroundColor: '#DBEAFE' },
    sortBtnText: { fontSize: 11, color: '#4B5563' },
    sortBtnTextActive: { color: '#1E40AF', fontWeight: 'bold' },
});

export default OverallReportScreen;
