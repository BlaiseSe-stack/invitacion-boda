import csv
import textwrap
from PIL import Image, ImageDraw, ImageFont
import os

COLOR_FONDO = "#fbf6f5"      
COLOR_TEXTO = "#5c4d4d"      
COLOR_DETALLES = "#b58d88"   

def generar_imagen_pase(apellido_familia, texto_invitados, numero_pases):
    ancho, alto = 800, 1000 # Dimensiones ideales para la pantalla del celular
    imagen = Image.new("RGB", (ancho, alto), COLOR_FONDO)
    canvas = ImageDraw.Draw(imagen)
    
    # Marcos decorativos elegantes
    canvas.rectangle([(30, 30), (ancho-30, alto-30)], outline=COLOR_DETALLES, width=3)
    canvas.rectangle([(45, 45), (ancho-45, alto-45)], outline=COLOR_DETALLES, width=1)

    try:
        fuente_titulo = ImageFont.truetype("georgia.ttf", 55)
        fuente_familia = ImageFont.truetype("times.ttf", 50)
        fuente_subtitulo = ImageFont.truetype("times.ttf", 34)
        fuente_texto = ImageFont.truetype("times.ttf", 32)
    except IOError:
        fuente_titulo = fuente_familia = fuente_subtitulo = fuente_texto = ImageFont.load_default()

    # --- LÓGICA DE PLURALIZACIÓN (PASE vs PASES) ---
    try:
        cantidad = int(numero_pases)
    except ValueError:
        cantidad = 1 
        
    texto_pase_plural = "pases" if cantidad > 1 else "pase"
    texto_tipo_plural = "Familiar" if cantidad > 1 else "Personal"
    texto_invitado_plural = "Invitados" if cantidad > 1 else "Invitado"
    texto_invitados_incluidos = "Invitados incluidos:" if cantidad > 1 else ""

    # --- ENCABEZADO ---
    canvas.text((ancho/2, 120), "¡NUESTRA BODA!", fill=COLOR_DETALLES, font=fuente_titulo, anchor="mm")
    canvas.text((ancho/2, 200), f"Pase {texto_tipo_plural} e Intransferible", fill=COLOR_TEXTO, font=fuente_subtitulo, anchor="mm")
    canvas.line([(200, 240), (600, 240)], fill=COLOR_DETALLES, width=2)

    # --- PREPARACIÓN DEL TEXTO (Para calcular el espacio vertical) ---
    lineas_a_dibujar = []
    
    # 1. Añadimos el tipo de invitado ("Invitado" o "Invitados")
    lineas_a_dibujar.append(texto_invitado_plural)
    
    # 2. Añadimos el apellido (procesado con textwrap por seguridad)
    lineas_a_dibujar.extend(textwrap.wrap(apellido_familia, width=24))
    
    # 3. Añadimos la tercera línea condicional
    if cantidad > 1:
        lineas_a_dibujar.append(f"{cantidad} {texto_pase_plural}")
    else:
        nombre_unico = texto_invitados.strip().strip(',')
        lineas_a_dibujar.extend(textwrap.wrap(nombre_unico, width=24))

    # --- DIBUJADO Y CENTRADO VERTICAL INTELIGENTE ---
    interlineado = 55
    
    if cantidad > 1:
        # Si es familiar, mantenemos una estructura fija arriba porque abajo viene la lista
        y_familia = 300
    else:
        # SI ES UN SOLO INVITADO: Calculamos el centro total del espacio disponible (entre la línea 240 y el pie 910)
        # El espacio disponible mide 670px. Su centro está en Y = 575.
        # Restamos la mitad del tamaño que ocupará nuestro bloque de texto para equilibrarlo perfectamente.
        total_alto_texto = len(lineas_a_dibujar) * interlineado
        y_familia = 575 - (total_alto_texto / 2) + (interlineado / 2)

    # Dibujamos las líneas calculadas
    for linea in lineas_a_dibujar:
        canvas.text((ancho/2, y_familia), linea, fill=COLOR_TEXTO, font=fuente_familia, anchor="mm")
        y_familia += interlineado

    # --- SECCIÓN: LISTA DE INTEGRANTES (Solo para pases familiares) ---
    if cantidad > 1:
        canvas.text((ancho/2, 530), f"{texto_invitados_incluidos}", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")
        
        y_pauta = 590
        MAX_CARACTERES_POR_LINEA = 42 
        for linea in texto_invitados.split(','):
            if linea.strip(): 
                sub_lineas = textwrap.wrap(linea, width=MAX_CARACTERES_POR_LINEA)
                for i, sub_linea in enumerate(sub_lineas):
                    texto_a_dibujar = sub_linea if i == 0 else "   " + sub_linea
                    canvas.text((ancho/2, y_pauta), texto_a_dibujar, fill=COLOR_TEXTO, font=fuente_texto, anchor="mm")
                    y_pauta += 45

    # --- PIE DE PÁGINA ---
    canvas.text((ancho/2, 910), "Presenta esta imagen en la recepción.", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")

    # --- GUARDAR ARCHIVO CON NOMBRE LIMPIO PARA URL ---
    nombre_archivo = f"pase_{apellido_familia.replace(' ', '_').lower()}.png"
    for a, b in zip(["á","é","í","ó","ú","ñ"], ["a","e","i","o","u","n"]):
        nombre_archivo = nombre_archivo.replace(a, b)
        
    imagen.save(nombre_archivo)
    print(f"🖼️ Imagen creada exitosamente: {nombre_archivo}")

# --- ENRUTADOR DE AUTOMATIZACIÓN (LECTURA DEL CSV) ---
with open('invitados.csv', mode='r', encoding='utf-8') as archivo_csv:
    lector = csv.DictReader(archivo_csv)
    for fila in lector:
        familia = fila['Familia']
        texto_qr = fila['InvitadosConfirmados']
        numero_pases = fila['TotalAsistentes'] 
        
        generar_imagen_pase(familia, texto_qr, numero_pases)