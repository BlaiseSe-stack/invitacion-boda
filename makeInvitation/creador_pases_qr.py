import csv
import textwrap
import os
from PIL import Image, ImageDraw, ImageFont
import qrcode # <--- Nueva librería para los QR

# --- CONFIGURACIÓN DE TU EVENTO ---
USUARIO_GITHUB = "blaisese-stack"
REPOSITORIO_GITHUB = "invitacion-boda"
URL_BASE_ACCESO = f"https://{USUARIO_GITHUB}.github.io/{REPOSITORIO_GITHUB}/acceso.html"

# --- PALETA DE COLORES ---
COLOR_FONDO = "#fbf6f5"      
COLOR_TEXTO = "#5c4d4d"      
COLOR_DETALLES = "#b58d88"   

def generar_imagen_pase_con_qr(apellido_familia, texto_invitados, numero_pases):
    # 1. GENERAR PRIMERO EL CÓDIGO QR EN MEMORIA
    llave_url = apellido_familia.lower().strip()
    for a, b in zip(["á","é","í","ó","ú","ñ"], ["a","e","i","o","u","n"]):
        llave_url = llave_url.replace(a, b)
    llave_url = llave_url.replace(" ", "-")
    
    enlace_qr = f"{URL_BASE_ACCESO}?familia={llave_url}"
    
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H, 
        box_size=6,                                        
        border=2,                                          
    )
    qr.add_data(enlace_qr)
    qr.make(fit=True)
    
    imagen_qr = qr.make_image(fill_color=COLOR_TEXTO, back_color=COLOR_FONDO)
    imagen_qr = imagen_qr.resize((230, 230))

    # 2. CREAR EL PASE DIGITAL
    ancho, alto = 800, 1000 
    imagen_pase = Image.new("RGB", (ancho, alto), COLOR_FONDO)
    canvas = ImageDraw.Draw(imagen_pase)
    
    # Marcos decorativos elegantes
    canvas.rectangle([(30, 30), (ancho-30, alto-30)], outline=COLOR_DETALLES, width=3)
    canvas.rectangle([(45, 45), (ancho-45, alto-45)], outline=COLOR_DETALLES, width=1)

    try:
        fuente_titulo = ImageFont.truetype("georgia.ttf", 55)
        fuente_familia = ImageFont.truetype("times.ttf", 50)
        fuente_subtitulo = ImageFont.truetype("times.ttf", 34)
        fuente_texto = ImageFont.truetype("times.ttf", 32)
        
        try:
            fuente_emoji = ImageFont.truetype("seguiemj.ttf", 28)
        except IOError:
            fuente_emoji = ImageFont.truetype("arial.ttf", 28)
            
    except IOError:
        fuente_titulo = fuente_familia = fuente_subtitulo = fuente_texto = fuente_emoji = ImageFont.load_default()

    # Lógica de conversión numérica
    try:
        cantidad = int(numero_pases)
    except ValueError:
        cantidad = 1 
        
    texto_pase_plural = "pases" if cantidad > 1 else "pase"
    texto_tipo_plural = "Familiar" if cantidad > 1 else "Personal"
    texto_invitado_plural = "Invitados" if cantidad > 1 else "Invitado"
    texto_invitados_incluidos = "Invitados incluidos:" if cantidad > 1 else ""

    # --- ENCABEZADO ---
    canvas.text((ancho/2, 110), "¡NUESTRA BODA!", fill=COLOR_DETALLES, font=fuente_titulo, anchor="mm")
    canvas.text((ancho/2, 185), f"Pase {texto_tipo_plural} e Intransferible", fill=COLOR_TEXTO, font=fuente_subtitulo, anchor="mm")
    canvas.line([(200, 220), (600, 220)], fill=COLOR_DETALLES, width=2)

    # --- PREPARACIÓN DEL TEXTO PRINCIPAL ---
    lineas_a_dibujar = []
    lineas_a_dibujar.append(texto_invitado_plural)
    lineas_a_dibujar.extend(textwrap.wrap(apellido_familia, width=24))
    
    if cantidad > 1:
        lineas_a_dibujar.append(f"{cantidad} {texto_pase_plural}")
    else:
        nombre_unico = texto_invitados.strip().strip(',')
        nombre_unico_limpio = nombre_unico.replace("[niño]", "👶 ")
        lineas_a_dibujar.extend(textwrap.wrap(nombre_unico_limpio, width=24))

    # --- DIBUJADO DE DATOS ---
    interlineado = 52
    y_familia = 270

    for linea in lineas_a_dibujar:
        canvas.text((ancho/2, y_familia), linea, fill=COLOR_TEXTO, font=fuente_familia, anchor="mm")
        y_familia += interlineado

    # --- SECCIÓN: LISTA DE INTEGRANTES (Distribución Inteligente y Centrada) ---
    if cantidad > 1:
        canvas.text((ancho/2, 490), f"{texto_invitados_incluidos}", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")
        
        y_pauta_inicial = 540
        lista_nombres = [n.strip() for n in texto_invitados.split(',') if n.strip()]
        total_integrantes = len(lista_nombres)
        
        for idx, linea in enumerate(lista_nombres[:6]): # Máximo 6 integrantes
            
            # 📊 ✨ NUEVA LOGICA DE CONDICION DE COLUMNAS
            if total_integrantes <= 3:
                # Si son 3 o menos integrantes, se quedan en una sola columna perfectamente al centro
                pos_x_base = ancho / 2
                fila_actual = idx
                max_caracteres = 42
            else:
                # Si son 4 o más, se dividen en dos columnas (3 y 3)
                max_caracteres = 20
                if idx < 3:
                    pos_x_base = 230  # Columna izquierda
                    fila_actual = idx
                else:
                    pos_x_base = 570  # Columna derecha
                    fila_actual = idx - 3
            
            # Calcular la altura Y según corresponda
            y_pauta = y_pauta_inicial + (fila_actual * 45)
            
            # Identificación de etiqueta niño
            es_nino = "[niño]" in linea
            texto_limpio = linea.replace("[niño]", "").strip()
            
            sub_lineas = textwrap.wrap(texto_limpio, width=max_caracteres)
            if sub_lineas:
                texto_a_dibujar = sub_lineas[0]
                
                if es_nino:
                    # Medimos el ancho del texto para pintar el emoji perfectamente alineado a la izquierda del nombre
                    ancho_texto = canvas.textlength(texto_a_dibujar, font=fuente_texto)
                    pos_x_emoji = pos_x_base - (ancho_texto / 2) - 25
                    
                    canvas.text((pos_x_emoji, y_pauta), "👶", fill=COLOR_TEXTO, font=fuente_emoji, anchor="mm")
                    canvas.text((pos_x_base, y_pauta), texto_a_dibujar, fill=COLOR_TEXTO, font=fuente_texto, anchor="mm")
                else:
                    # Adulto normal centrado en la estructura seleccionada (centro o columna)
                    canvas.text((pos_x_base, y_pauta), texto_a_dibujar, fill=COLOR_TEXTO, font=fuente_texto, anchor="mm")

    # --- 3. PEGAR EL CÓDIGO QR EN LA IMAGEN ---
    posicion_qr = (285, 680)
    imagen_pase.paste(imagen_qr, posicion_qr)

    # --- PIE DE PÁGINA ---
    canvas.text((ancho/2, 940), "Muestra este código QR en la recepción.", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")

    # --- GUARDAR ARCHIVO ---
    carpeta_salida = "pases_digitales"
    if not os.path.exists(carpeta_salida):
        os.makedirs(carpeta_salida)

    nombre_archivo = f"pase_{apellido_familia.replace(' ', '_').lower()}.png"
    for a, b in zip(["á","é","í","ó","ú","ñ"], ["a","e","i","o","u","n"]):
        nombre_archivo = nombre_archivo.replace(a, b)
        
    ruta_completa = os.path.join(carpeta_salida, nombre_archivo)
    imagen_pase.save(ruta_completa)
    print(f"✅ Pase con QR generado: {ruta_completa}")

# --- ENRUTADOR AUTOMÁTICO ---
if not os.path.exists('invitados.csv'):
    print("❌ Error: No se encontró el archivo 'invitados.csv' en esta carpeta.")
else:
    with open('invitados.csv', mode='r', encoding='utf-8') as archivo_csv:
        lector = csv.DictReader(archivo_csv)
        for fila in lector:
            familia = fila['Familia']
            texto_qr = fila['InvitadosConfirmados']
            numero_pases = fila['TotalAsistentes'] 
            
            generar_imagen_pase_con_qr(familia, texto_qr, numero_pases)
    print("\n🎉 ¡Proceso terminado! Busca tus pases en la carpeta 'pases_digitales'.")