import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, ScrollView, TouchableOpacity, 
  TextInput, Alert, SafeAreaView, Modal 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

export default function App() {
  // --- 1. ESTADO DE LOS DATOS ---
  const [datos, setDatos] = useState({
    fecha: new Date().toLocaleDateString(),
    of: '', turno: 'Mañana', equipo: 'T1',
    calidad: { ok: 0, r1: 0, ko: 0 },
    final: { ok: 0, r1: 0, ko: 0 },
    obs: ''
  });

  // --- 2. PERSISTENCIA (Auto-guardado) ---
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const guardado = await AsyncStorage.getItem('@turno_actual');
      if (guardado !== null) setDatos(JSON.parse(guardado));
    } catch (e) { console.log("Error cargando datos"); }
  };

  const actualizar = async (nuevoEstado) => {
    setDatos(nuevoEstado);
    await AsyncStorage.setItem('@turno_actual', JSON.stringify(nuevoEstado));
  };

  // --- 3. LÓGICA DE EDICIÓN (Lápiz / Clic Largo) ---
  const editarCifra = (zona, tipo) => {
    Alert.prompt(
      "Editar Cifra",
      `Introduce el valor manual para ${tipo.toUpperCase()}:`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Guardar", 
          onPress: (valor) => {
            const num = parseInt(valor) || 0;
            const nuevo = { ...datos };
            nuevo[zona][tipo] = num;
            actualizar(nuevo);
          } 
        }
      ],
      "plain-text"
    );
  };

  // --- 4. ENVÍO A EXCEL Y PDF ---
  const enviarInforme = async () => {
    // REEMPLAZA ESTO con tu URL de Google Apps Script (la que termina en /exec)
    const URL_GOOGLE = "TU_URL_DE_APPSCRIPT_AQUI";

    try {
      // Enviar al Excel
      await fetch(URL_GOOGLE, {
        method: 'POST',
        body: JSON.stringify({
          fecha: datos.fecha, of: datos.of, turno: datos.turno, equipo: datos.equipo,
          ok_cal: datos.calidad.ok, r1_cal: datos.calidad.r1, ko_cal: datos.calidad.ko,
          ok_fin: datos.final.ok, r1_fin: datos.final.r1, ko_fin: datos.final.ko,
          totalCal: datos.calidad.ok + datos.calidad.r1 + datos.calidad.ko,
          totalFin: datos.final.ok + datos.final.r1 + datos.final.ko,
          minutos_parada: 0, // Aquí conectarías tu lógica de reloj
          observaciones: datos.obs
        })
      });

      // Crear PDF "Bonito"
      const htmlContent = `
        <h1 style="text-align:center;">LÍNEA DECORACIÓN</h1>
        <p>OF: ${datos.of} | Turno: ${datos.turno} | Equipo: ${datos.equipo}</p>
        <hr/>
        <h3>ZONA CALIDAD</h3>
        <p>OK: ${datos.calidad.ok} | R1: ${datos.calidad.r1} | KO: ${datos.calidad.ko}</p>
        <h3>ZONA FINAL</h3>
        <p>OK: ${datos.final.ok} | R1: ${datos.final.r1} | KO: ${datos.final.ko}</p>
        <hr/>
        <p>Obs: ${datos.obs}</p>
      `;
      
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await shareAsync(uri);
      
      Alert.alert("¡Hecho!", "Datos enviados al Excel y PDF generado.");
    } catch (e) {
      Alert.alert("Error", "No se pudo enviar. Revisa la URL o tu conexión.");
    }
  };

  // --- 5. DISEÑO VISUAL ---
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.titulo}>LÍNEA DECORACIÓN</Text>
        
        {/* Registro inicial */}
        <View style={styles.card}>
          <TextInput 
            style={styles.input} 
            placeholder="Orden de Fabricación (OF)" 
            value={datos.of}
            onChangeText={(t) => actualizar({...datos, of: t})}
          />
          <View style={styles.row}>
            {['Mañana', 'Tarde', 'Noche'].map(t => (
              <TouchableOpacity 
                key={t} 
                style={[styles.btnTurno, datos.turno === t && styles.active]}
                onPress={() => actualizar({...datos, turno: t})}
              >
                <Text style={datos.turno === t ? styles.white : styles.black}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Zona Calidad */}
        <Text style={styles.sectionTitle}>ZONA CALIDAD</Text>
        <View style={styles.row}>
          <BotonContador color="#4CAF50" label="OK" valor={datos.calidad.ok} 
            onPlus={() => actualizar({...datos, calidad: {...datos.calidad, ok: datos.calidad.ok + 1}})}
            onLong={() => editarCifra('calidad', 'ok')} />
          <BotonContador color="#FFC107" label="R1" valor={datos.calidad.r1} 
            onPlus={() => actualizar({...datos, calidad: {...datos.calidad, r1: datos.calidad.r1 + 1}})}
            onLong={() => editarCifra('calidad', 'r1')} />
          <BotonContador color="#F44336" label="KO" valor={datos.calidad.ko} 
            onPlus={() => actualizar({...datos, calidad: {...datos.calidad, ko: datos.calidad.ko + 1}})}
            onLong={() => editarCifra('calidad', 'ko')} />
        </View>

        {/* Zona Final */}
        <Text style={styles.sectionTitle}>ZONA FINAL / EMBALAJE</Text>
        <View style={styles.row}>
          <BotonContador color="#4CAF50" label="OK" valor={datos.final.ok} 
            onPlus={() => actualizar({...datos, final: {...datos.final, ok: datos.final.ok + 1}})}
            onLong={() => editarCifra('final', 'ok')} />
          <BotonContador color="#FFC107" label="R1" valor={datos.final.r1} 
            onPlus={() => actualizar({...datos, final: {...datos.final, r1: datos.final.r1 + 1}})}
            onLong={() => editarCifra('final', 'r1')} />
          <BotonContador color="#F44336" label="KO" valor={datos.final.ko} 
            onPlus={() => actualizar({...datos, final: {...datos.final, ko: datos.final.ko + 1}})}
            onLong={() => editarCifra('final', 'ko')} />
        </View>

        <TextInput 
          style={styles.textArea} 
          placeholder="Observaciones (Dictado por voz)..." 
          multiline 
          value={datos.obs}
          onChangeText={(t) => actualizar({...datos, obs: t})}
        />

        <TouchableOpacity style={styles.btnFinal} onPress={enviarInforme}>
          <Text style={styles.whiteBold}>FINALIZAR E INFORMAR</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Componente para los botones OK, R1, KO
const BotonContador = ({ color, label, valor, onPlus, onLong }) => (
  <TouchableOpacity 
    style={[styles.btnContador, { backgroundColor: color }]} 
    onPress={onPlus} 
    onLongPress={onLong}
  >
    <Text style={styles.whiteBold}>{label}</Text>
    <Text style={styles.whiteValue}>{valor}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 20 },
  titulo: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#1a237e' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 25, marginBottom: 10, color: '#333' },
  card: { backgroundColor: 'white', padding: 15, borderRadius: 10, elevation: 2 },
  input: { borderBottomWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  btnTurno: { padding: 10, borderWidth: 1, borderColor: '#ccc', borderRadius: 5, width: '30%', alignItems: 'center' },
  active: { backgroundColor: '#1a237e', borderColor: '#1a237e' },
  btnContador: { width: '31%', paddingVertical: 20, borderRadius: 12, alignItems: 'center', elevation: 3 },
  textArea: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginTop: 20, height: 100, textAlignVertical: 'top' },
  btnFinal: { backgroundColor: '#1a237e', padding: 20, borderRadius: 15, marginTop: 30, alignItems: 'center' },
  white: { color: 'white' },
  black: { color: 'black' },
  whiteBold: { color: 'white', fontWeight: 'bold' },
  whiteValue: { color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 5 }
});
