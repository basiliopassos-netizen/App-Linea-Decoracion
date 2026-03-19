import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert, SafeAreaView 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

// URL DE TU EXCEL CONECTADA
const URL_EXCEL = "https://script.google.com/macros/s/AKfycbxVXOtE0NzOdUZL9xPVR0lsOCkLCrRAQBqZYyuBHOnaAnXn8lR2nmHnCQzhM-goXOmT3Q/exec";

export default function App() {
  const [datos, setDatos] = useState({
    fecha: new Date().toLocaleDateString(),
    of: '', turno: 'Mañana', equipo: 'T1',
    calidad: { ok: 0, r1: 0, ko: 0 },
    final: { ok: 0, r1: 0, ko: 0 },
    obs: ''
  });

  useEffect(() => {
    const cargar = async () => {
      const g = await AsyncStorage.getItem('@turno_v1');
      if (g) setDatos(JSON.parse(g));
    };
    cargar();
  }, []);

  const guardar = async (n) => {
    setDatos(n);
    await AsyncStorage.setItem('@turno_v1', JSON.stringify(n));
  };

  const enviarInforme = async () => {
    try {
      // 1. Enviar datos al Excel de Google
      const respuesta = await fetch(URL_EXCEL, {
        method: 'POST',
        body: JSON.stringify({
          fecha: datos.fecha, of: datos.of, turno: datos.turno, equipo: datos.equipo,
          ok_cal: datos.calidad.ok, r1_cal: datos.calidad.r1, ko_cal: datos.calidad.ko,
          ok_fin: datos.final.ok, r1_fin: datos.final.r1, ko_fin: datos.final.ko,
          totalCal: datos.calidad.ok + datos.calidad.r1 + datos.calidad.ko,
          totalFin: datos.final.ok + datos.final.r1 + datos.final.ko,
          minutos_parada: 0, 
          observaciones: datos.obs
        })
      });

      // 2. Generar PDF Profesional
      const html = `
        <h1 style="color:#1a237e;text-align:center;">LÍNEA DECORACIÓN</h1>
        <p><strong>FECHA:</strong> ${datos.fecha} | <strong>OF:</strong> ${datos.of}</p>
        <p><strong>TURNO:</strong> ${datos.turno} | <strong>EQUIPO:</strong> ${datos.equipo}</p>
        <hr/>
        <h2 style="color:#2e7d32;">ZONA CALIDAD</h2>
        <p>OK: ${datos.calidad.ok} | R1: ${datos.calidad.r1} | KO: ${datos.calidad.ko}</p>
        <h2 style="color:#1565c0;">ZONA FINAL / EMBALAJE</h2>
        <p>OK: ${datos.final.ok} | R1: ${datos.final.r1} | KO: ${datos.final.ko}</p>
        <hr/>
        <p><strong>OBSERVACIONES:</strong> ${datos.obs}</p>
      `;
      
      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri);
      Alert.alert("Éxito", "Excel actualizado y PDF generado correctamente.");
    } catch (e) {
      Alert.alert("Error", "No se pudo conectar con el Excel. Revisa tu conexión.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{padding: 20}}>
        <Text style={styles.head}>LÍNEA DECORACIÓN</Text>
        
        <View style={styles.card}>
          <TextInput 
            style={styles.input} placeholder="Orden de Fab. (OF)" 
            value={datos.of} onChangeText={t => guardar({...datos, of: t})} 
          />
          <View style={styles.row}>
            {['Mañana', 'Tarde', 'Noche'].map(t => (
              <TouchableOpacity key={t} onPress={() => guardar({...datos, turno: t})}
                style={[styles.btnT, datos.turno === t && styles.act]}>
                <Text style={{color: datos.turno === t ? '#fff' : '#000'}}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sub}>ZONA CALIDAD (Carga)</Text>
        <View style={styles.row}>
          <Btn color="#4CAF50" num={datos.calidad.ok} label="OK" 
            onP={() => guardar({...datos, calidad:{...datos.calidad, ok:datos.calidad.ok+1}})} />
          <Btn color="#FFC107" num={datos.calidad.r1} label="R1" 
            onP={() => guardar({...datos, calidad:{...datos.calidad, r1:datos.calidad.r1+1}})} />
          <Btn color="#F44336" num={datos.calidad.ko} label="KO" 
            onP={() => guardar({...datos, calidad:{...datos.calidad, ko:datos.calidad.ko+1}})} />
        </View>

        <Text style={styles.sub}>ZONA FINAL (Decoración/Salida)</Text>
        <View style={styles.row}>
          <Btn color="#4CAF50" num={datos.final.ok} label="OK" 
            onP={() => guardar({...datos, final:{...datos.final, ok:datos.final.ok+1}})} />
          <Btn color="#FFC107" num={datos.final.r1} label="R1" 
            onP={() => guardar({...datos, final:{...datos.final, r1:datos.final.r1+1}})} />
          <Btn color="#F44336" num={datos.final.ko} label="KO" 
            onP={() => guardar({...datos, final:{...datos.final, ko:datos.final.ko+1}})} />
        </View>

        <TextInput 
          style={styles.area} placeholder="Notas (Bultos, fallos Kerajet, paradas...)" 
          multiline value={datos.obs} onChangeText={t => guardar({...datos, obs: t})} 
        />

        <TouchableOpacity style={styles.btnFin} onPress={enviarInforme}>
          <Text style={styles.wB}>FINALIZAR E INFORMAR</Text>
        </TouchableOpacity>
        
        <Text style={{textAlign:'center', marginTop:20, color:'#999', fontSize:10}}>v1.0 - Control Operativo Personal</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const Btn = ({color, num, label, onP}) => (
  <TouchableOpacity onPress={onP} style={[styles.btnC, {backgroundColor: color}]}>
    <Text style={styles.w}>{label}</Text>
    <Text style={styles.wN}>{num}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  head: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#1a237e' },
  sub: { fontWeight: 'bold', marginTop: 25, marginBottom: 10, color: '#444' },
  card: { padding: 15, backgroundColor: '#f9f9f9', borderRadius: 10, borderWeight: 1, borderColor: '#eee' },
  input: { borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 15, padding: 5, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btnT: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, width: '30%', alignItems: 'center' },
  act: { backgroundColor: '#1a237e', borderColor: '#1a237e' },
  btnC: { width: '31%', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2 },
  w: { color: '#fff', fontWeight: 'bold' },
  wN: { color
