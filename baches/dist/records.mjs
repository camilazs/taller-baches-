// Fuente: recorrido narrado por el usuario. No son resultados de IA ni puntos GPS.
const ida = [
  ['reductor', 'Frente al batallón', 'Calle 22, después del Hospital Departamental.'],
  ['reductor', 'Cerca del Pedagógico', 'Carrera 26, después de avenida Colombia, avenida Santander y los dos puentes.'],
  ['reductor', 'Frente al colegio Pedagógico', 'Calle 22B.'],
  ['reductor', 'Llegando a Batericars', 'Calle 22B, después del colegio.'],
  ['bache', 'Frente al hotel V1501', 'Calle 20, después de avenida de los Estudiantes.'],
  ['reductor', 'Ingreso a Morasurco', 'Calle 22, tras desviarse por Margarita Pinta.'],
  ['reductor', 'Morasurco · segundo reductor', 'Calle 22, unos metros después del anterior.'],
  ['bache', 'Morasurco · calle 22', 'Aproximadamente 50 metros después del segundo reductor.'],
  ['reductor', 'Morasurco · tercer reductor', 'Calle 22, después del bache.'],
  ['bache', 'Panamericana / carrera 44', 'Bache reportado en carrera 44.'],
  ['bache', 'Calle 19B', 'Después del bache de carrera 44.'],
  ['bache', 'Parqueadero de la UCC', 'Carrera 45, frente al parqueadero, antes de llegar a la universidad.'],
];
const regreso = [
  ['rampa', 'Salida de la universidad', 'Rampa pequeña en calle 18.'],
  ['desnivel', 'Calle 18 · deterioro inicial', 'Desnivel que está empezando a convertirse en bache.'],
  ['desnivel', 'Giro hacia carrera 40', 'Tras girar a la izquierda, desnivel en formación.'],
  ['bache', 'Calle 19 · primer bache', 'Después de girar a la derecha desde carrera 40.'],
  ['bache', 'Calle 19 · bache con relieve', 'Un poco después del primer bache.'],
  ['bache', 'Calle 19 · baches seguidos (1)', 'Primero de dos baches consecutivos.'],
  ['bache', 'Calle 19 · baches seguidos (2)', 'Segundo de dos baches consecutivos.'],
  ['bache', 'Calle 19 · después del semáforo', 'Bache reportado al pasar el semáforo.'],
  ['bache', 'Carrera 31C', 'Después de girar a la izquierda.'],
  ['bache', 'Calle 21 · después de bajar dos calles', 'Bache reportado en calle 21.'],
  ['desnivel', 'Calle 21 · cerca del bache', 'Desnivel independiente junto al bache anterior.'],
  ['bache', 'Calle 21 · bache parcial (1)', 'Primero de dos “medio baches con un desnivel”; revisar clasificación con la foto.'],
  ['bache', 'Calle 21 · bache parcial (2)', 'Segundo de dos “medio baches con un desnivel”; revisar clasificación con la foto.'],
  ['bache', 'Calle 21 · después del giro', 'Bache después de girar a la derecha.'],
  ['bache', 'Cerca de la Policía Nacional', 'Pequeño bache en calle 21.'],
  ['bache', 'Calle 21 · pequeño bache siguiente', 'Un poco después del bache cerca de la Policía.'],
  ['bache', 'Iglesia de la Panadería', 'Después de girar a la derecha; bache grande y calle en muy mal estado según el relato.'],
  ['desnivel', 'Avenida Santander', 'Desnivel que está empezando a convertirse en bache.'],
  ['reductor', 'Avenida Colombia · batallón', 'Reductor de velocidad frente al batallón.'],
  ['bache', 'Avenida Bolívar', 'Frente al parque Bolívar.'],
  ['bache', 'Llegada al parque Bolívar', 'Carrera 7, al llegar al destino.'],
];
export const categories = { bache: 'Bache', reductor: 'Reductor', desnivel: 'Desnivel', rampa: 'Rampa', pendiente: 'Sin clasificar' };
export const routeInfo = {
  city: 'Pasto, Nariño',
  ida: 'Parque Bolívar → Hospital Departamental → Batallón → Av. Colombia → Av. Santander → Dos puentes → Pedagógico → Av. de los Estudiantes → Hotel V1501 → Margarita Pinta → Morasurco → Panamericana → UCC',
  regreso: 'UCC → Calle 18 → Carrera 40 → Calle 19 → Carrera 31C → Calle 21 → Policía Nacional → Iglesia de la Panadería → Av. Santander → Av. Colombia → Batallón → Av. Bolívar → Parque Bolívar',
  addressNote: 'La dirección particular se omite de la copia pública. Confirmar la ruta definitiva con el responsable del recorrido.'
};
export const seedRecords = [
  ...ida.map(([category, title, description], i) => ({ id: `I${String(i + 1).padStart(2, '0')}`, direction: 'ida', order: i + 1, category, title, description })),
  ...regreso.map(([category, title, description], i) => ({ id: `R${String(i + 1).padStart(2, '0')}`, direction: 'regreso', order: i + 1, category, title, description })),
].map(r => ({ ...r, lat: null, lng: null, locationSource: null, photo: null, analysis: null, source: 'Relato del recorrido', status: 'Pendiente de evidencia' }));
