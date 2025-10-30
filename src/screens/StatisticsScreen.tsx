import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useAuth } from '../context/AuthContext';
import SupabaseStatisticsService, { 
  WeeklyHoursData, 
  RoutineStatsData, 
  LastFiveRoutinesData, 
  GeneralStatsData 
} from '../services/SupabaseStatisticsService';

const { width: screenWidth } = Dimensions.get('window');

interface StatisticsScreenProps {
  onNavigateBack: () => void;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }>;
}

export default function StatisticsScreen({ onNavigateBack }: StatisticsScreenProps) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = useThemedStyles(createStyles);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generalStats, setGeneralStats] = useState<GeneralStatsData | null>(null);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHoursData[]>([]);
  const [routineStats, setRoutineStats] = useState<RoutineStatsData | null>(null);
  const [lastRoutines, setLastRoutines] = useState<LastFiveRoutinesData[]>([]);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      
      // Cargar todas las estadísticas en paralelo
      const [
        generalResult,
        weeklyResult,
        routineResult,
        lastRoutinesResult
      ] = await Promise.all([
        SupabaseStatisticsService.getGeneralStats(),
        SupabaseStatisticsService.getWeeklyHours(),
        SupabaseStatisticsService.getRoutineStats(),
        SupabaseStatisticsService.getLastFiveRoutines()
      ]);

      if (generalResult.success) setGeneralStats(generalResult.data || null);
      if (weeklyResult.success) setWeeklyHours(weeklyResult.data || []);
      if (routineResult.success) setRoutineStats(routineResult.data || null);
      if (lastRoutinesResult.success) setLastRoutines(lastRoutinesResult.data || []);
      
    } catch (error) {
      console.log('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  // Datos reales para los gráficos
  const getWeeklyData = (): ChartData => ({
    labels: weeklyHours.map(item => item.day),
    datasets: [{
      data: weeklyHours.map(item => item.hours),
      color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
      strokeWidth: 3,
    }],
  });

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const getRoutineCompletionData = (): ChartData => {
    if (!routineStats) return { labels: [], datasets: [] };
    
    return {
      labels: ['Completadas', 'Pendientes', 'Canceladas'],
      datasets: [{
        data: [routineStats.completed, routineStats.pending, routineStats.cancelled],
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
      }],
    };
  };


  const getLastRoutinesData = (): ChartData => ({
    labels: lastRoutines.map(item => item.name),
    datasets: [{
      data: lastRoutines.map(item => item.value),
      color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
    }],
  });

  // Función para crear gráfico de barras simple
  const renderBarChart = (
    data: ChartData,
    title: string,
    subtitle: string,
    valueFormatter?: (v: number) => string
  ) => {
    const maxValue = Math.max(...data.datasets[0].data);
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSubtitle}>{subtitle}</Text>
        
        <View style={styles.barChartContainer}>
          {data.labels.map((label, index) => {
            const value = data.datasets[0].data[index];
            const height = (value / maxValue) * 120; // Altura máxima de 120
            
            return (
              <View key={index} style={styles.barItem}>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: height,
                        backgroundColor: data.datasets[0].color?.(0.8) || theme.colors.primary
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barLabel}>{label}</Text>
                <Text style={styles.barValue}>{valueFormatter ? valueFormatter(value) : value}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Función para crear gráfico circular simple
  const renderPieChart = (data: ChartData, title: string, subtitle: string) => {
    if (data.labels.length === 0 || data.datasets[0].data.length === 0) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No hay datos disponibles</Text>
          </View>
        </View>
      );
    }

    const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
    const colors = [
      'rgba(76, 175, 80, 0.8)',   // Verde para completadas
      'rgba(255, 193, 7, 0.8)',   // Amarillo para pendientes
      'rgba(244, 67, 54, 0.8)',   // Rojo para canceladas
    ];
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSubtitle}>{subtitle}</Text>
        
        <View style={styles.pieChartContainer}>
          <View style={styles.pieChart}>
            {data.labels.map((label, index) => {
              const value = data.datasets[0].data[index];
              const percentage = total > 0 ? (value / total) * 100 : 0;
              
              return (
                <View key={index} style={styles.pieLegend}>
                  <View 
                    style={[
                      styles.pieLegendColor, 
                      { backgroundColor: colors[index] || theme.colors.primary }
                    ]} 
                  />
                  <Text style={styles.pieLegendText}>
                    {label}: {value} ({percentage.toFixed(1)}%)
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  // Función para crear gráfico de líneas simple
  const renderLineChart = (data: ChartData, title: string, subtitle: string, showEmptyMessage: boolean = false) => {
    // Verificar si hay datos válidos (labels y datasets con datos)
    const hasValidData = data.labels.length > 0 && 
                         data.datasets.length > 0 && 
                         data.datasets[0].data.length > 0 &&
                         data.datasets[0].data.length === data.labels.length;
    
    // Verificar si hay valores mayores a 0 (para determinar si mostrar gráfico o mensaje vacío)
    const hasNonZeroValues = data.datasets[0]?.data.some(value => value > 0) || false;
    
    if (!hasValidData) {
      return (
        <View style={styles.chartContainerSmall}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
          <View style={styles.noDataContainerSmall}>
            <Ionicons name="information-circle-outline" size={32} color={theme.colors.primary} style={{ opacity: 0.5, marginBottom: 8 }} />
            <Text style={styles.noDataText}>No se han registrado sesiones</Text>
          </View>
        </View>
      );
    }

    const maxValue = Math.max(...data.datasets[0].data);
    const minValue = Math.min(...data.datasets[0].data);
    const range = maxValue - minValue;
    
    return (
      <View style={styles.chartContainerSmall}>
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSubtitle}>{subtitle}</Text>
        
        <View style={styles.lineChartContainerSmall}>
          <View style={styles.lineChart}>
            {data.labels.map((label, index) => {
              const value = data.datasets[0].data[index];
              const normalizedValue = range > 0 ? (value - minValue) / range : 0.5;
              const y = 80 - (normalizedValue * 70); // Posición Y invertida, altura reducida
              
              return (
                <View key={index} style={styles.linePoint}>
                  <View 
                    style={[
                      styles.lineDot,
                      { 
                        top: y,
                        backgroundColor: data.datasets[0].color?.(0.8) || theme.colors.primary
                      }
                    ]} 
                  />
                  <Text style={styles.lineLabel}>{label}</Text>
                  <Text style={styles.lineValue}>{value}%</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Estadísticas Detalladas</Text>
          <Text style={styles.headerSubtitle}>
            {user?.nombre} {user?.apellido}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Resumen de estadísticas */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resumen General</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.summaryNumber}>{generalStats?.totalHours || 0}</Text>
              <Text style={styles.summaryLabel}>Horas Totales</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.summaryNumber}>{generalStats?.completedRoutines || 0}</Text>
              <Text style={styles.summaryLabel}>Rutinas Completadas</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="trending-up-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.summaryNumber}>{generalStats?.productivity || 0}%</Text>
              <Text style={styles.summaryLabel}>Productividad</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.summaryNumber}>{generalStats?.activeDays || 0}</Text>
              <Text style={styles.summaryLabel}>Días Activos</Text>
            </View>
          </View>
        </View>

        {/* Gráfico de horas semanales */}
        {renderBarChart(
          getWeeklyData(),
          'Horas Trabajadas por Día',
          'Última semana'
        )}

        {/* Gráfico de rutinas */}
        {renderPieChart(
          getRoutineCompletionData(),
          'Estado de Rutinas',
          'Distribución actual'
        )}

        {/* Últimas 5 rutinas */}
        {renderBarChart(
          getLastRoutinesData(),
          'Últimas 5 Rutinas',
          'Duración por rutina (minutos)',
          (v) => formatMinutes(v)
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useThemedStyles>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.primary,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 16,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 8,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.primary,
    opacity: 0.8,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chartContainerSmall: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: theme.colors.primary,
    opacity: 0.8,
    marginBottom: 20,
  },
  // Estilos para gráfico de barras
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 160,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 120,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 30,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  barLabel: {
    fontSize: 12,
    color: theme.colors.primary,
    opacity: 0.8,
    marginBottom: 4,
  },
  barValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  // Estilos para gráfico circular
  pieChartContainer: {
    alignItems: 'center',
  },
  pieChart: {
    width: '100%',
    paddingVertical: 20,
  },
  pieItem: {
    position: 'absolute',
  },
  pieSlice: {
    width: 200,
    height: 200,
    borderRadius: 100,
    position: 'absolute',
  },
  pieLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  pieLegendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  pieLegendText: {
    fontSize: 14,
    color: theme.colors.primary,
    flex: 1,
  },
  // Estilos para gráfico de líneas
  lineChartContainer: {
    height: 200,
    paddingVertical: 20,
  },
  lineChartContainerSmall: {
    height: 120,
    paddingVertical: 12,
  },
  lineChart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    position: 'relative',
    paddingHorizontal: 10,
  },
  linePoint: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
    paddingHorizontal: 4,
  },
  lineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    top: 0,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  lineLabel: {
    fontSize: 12,
    color: theme.colors.primary,
    opacity: 0.8,
    marginTop: 25,
    marginBottom: 4,
    textAlign: 'center',
  },
  lineValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
  },
  noDataContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataContainerSmall: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.primary,
    opacity: 0.6,
    textAlign: 'center',
  },
});
