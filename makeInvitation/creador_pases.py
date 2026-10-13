import csv
import textwrap
import os
import re
from PIL import Image, ImageDraw, ImageFont

# --- PALETA DE COLORES ---
COLOR_FONDO = "#fbf6f5"      
COLOR_TEXTO = "#5c4d4d"      
COLOR_DETALLES = "#b58d88"   
COLOR_RESALTADO = "#d35400"    # Color para la alerta/badge de mesa individual
COLOR_BG_BADGE = "#fdebd0"     # Fondo suave para destacar invitado con mesa aparte

def generar_imagen_pase(apellido_familia, texto_invitados, numero_pases, mesa_familia):
    # CREAR EL PASE DIGITAL
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
        fuente_texto = ImageFont.truetype("times.ttf", 30)
        fuente_badge = ImageFont.truetype("timesbd.ttf", 24)
        fuente_mesa_num = ImageFont.truetype("georgia.ttf", 75)
        
        try:
            fuente_emoji = ImageFont.truetype("seguiemj.ttf", 26)
        except IOError:
            fuente_emoji = ImageFont.truetype("arial.ttf", 26)
            
    except IOError:
        fuente_titulo = fuente_familia = fuente_subtitulo = fuente_texto = fuente_badge = fuente_mesa_num = fuente_emoji = ImageFont.load_default()

    # Lógica de conversión numérica
    try:
        cantidad = int(numero_pases)
    except (ValueError, TypeError):
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
        # Limpiamos etiquetas de niño y mesa individual para el nombre principal si es solo 1 pase
        nombre_unico_limpio = re.sub(r'\[\d+\]', '', nombre_unico).replace("[niño]", "👶 ").strip()
        lineas_a_dibujar.extend(textwrap.wrap(nombre_unico_limpio, width=24))

    # --- DIBUJADO DE DATOS PRINCIPALES ---
    interlineado = 52
    y_familia = 270

    for linea in lineas_a_dibujar:
        canvas.text((ancho/2, y_familia), linea, fill=COLOR_TEXTO, font=fuente_familia, anchor="mm")
        y_familia += interlineado

    # --- SECCIÓN: LISTA DE INTEGRANTES CON DETECCIÓN DE MESA APARTE [N] ---
    if cantidad > 1:
        canvas.text((ancho/2, 490), f"{texto_invitados_incluidos}", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")
        
        y_pauta_inicial = 535
        lista_nombres = [n.strip() for n in texto_invitados.split(',') if n.strip()]
        total_integrantes = len(lista_nombres)
        
        for idx, linea in enumerate(lista_nombres[:6]): # Máximo 6 integrantes
            
            # Configuración de columnas según cantidad de integrantes
            if total_integrantes <= 3:
                pos_x_base = ancho / 2
                fila_actual = idx
                max_caracteres = 38
            else:
                max_caracteres = 20
                if idx < 3:
                    pos_x_base = 230  # Columna izquierda
                    fila_actual = idx
                else:
                    pos_x_base = 570  # Columna derecha
                    fila_actual = idx - 3
            
            y_pauta = y_pauta_inicial + (fila_actual * 48)
            
            # Identificación de etiqueta [niño] y mesa individual [N]
            es_nino = "[niño]" in linea
            
            # Buscamos patrón [N] donde N es un número de mesa
            match_mesa = re.search(r'\[(\d+)\]', linea)
            num_mesa_individual = match_mesa.group(1) if match_mesa else None
            
            # Limpiamos las etiquetas para obtener únicamente el nombre
            texto_limpio = re.sub(r'\[\d+\]', '', linea).replace("[niño]", "").strip()
            
            sub_lineas = textwrap.wrap(texto_limpio, width=max_caracteres)
            if sub_lineas:
                texto_a_dibujar = sub_lineas[0]
                
                # Si el invitado tiene asignada una mesa distinta en corchetes [N]
                if num_mesa_individual:
                    texto_etiqueta_mesa = f"Mesa_{num_mesa_individual}"
                    
                    # Dibujar badge / recuadro de aviso resaltado
                    canvas.text((pos_x_base - 35, y_pauta), texto_a_dibujar, fill=COLOR_TEXTO, font=fuente_texto, anchor="rm")
                    
                    # Medimos la etiqueta para el recuadro
                    bbox = canvas.textbbox((pos_x_base + 10, y_pauta), texto_etiqueta_mesa, font=fuente_badge, anchor="lm")
                    padding = 4
                    rect = [bbox[0]-padding, bbox[1]-padding, bbox[2]+padding, bbox[3]+padding]
                    
                    canvas.rectangle(rect, fill=COLOR_BG_BADGE, outline=COLOR_RESALTADO, width=1)
                    canvas.text((pos_x_base + 10, y_pauta), texto_etiqueta_mesa, fill=COLOR_RESALTADO, font=fuente_badge, anchor="lm")
                
                elif es_nino:
                    ancho_texto = canvas.textlength(texto_a_dibujar, font=fuente_texto)
                    pos_x_emoji = pos_x_base - (ancho_texto / 2) - 25
                    
                    canvas.text((pos_x_emoji, y_pauta), "👶", fill=COLOR_TEXTO, font=fuente_emoji, anchor="mm")
                    canvas.text((pos_x_base, y_pauta), texto_a_dibujar, fill=COLOR_TEXTO, font=fuente_texto, anchor="mm")
                else:
                    canvas.text((pos_x_base, y_pauta), texto_a_dibujar, fill=COLOR_TEXTO, font=fuente_texto, anchor="mm")

    # --- SECCIÓN: NÚMERO DE MESA PRINCIPAL ---
    # Dibujar recuadro de la mesa
    box_top_y = 700
    box_bottom_y = 880
    canvas.rectangle([(150, box_top_y), (ancho-150, box_bottom_y)], fill="#f3ebe8", outline=COLOR_DETALLES, width=2)
    
    canvas.text((ancho/2, box_top_y + 35), "UBICACIÓN ASIGNADA", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")
    
    # Formateo del número de mesa (Ejemplo: "Mesa 5" o solo el valor si ya trae la palabra)
    texto_mesa_display = f"MESA {mesa_familia}".upper() if str(mesa_familia).isdigit() else f"{mesa_familia}".upper()
    canvas.text((ancho/2, box_top_y + 110), texto_mesa_display, fill=COLOR_TEXTO, font=fuente_mesa_num, anchor="mm")

    # --- PIE DE PÁGINA ---
    canvas.text((ancho/2, 940), "Presenta este pase en la recepción al ingresar.", fill=COLOR_DETALLES, font=fuente_subtitulo, anchor="mm")

    # --- GUARDAR ARCHIVO ---
    carpeta_salida = "pases_digitales"
    if not os.path.exists(carpeta_salida):
        os.makedirs(carpeta_salida)

    nombre_archivo = f"pase_{apellido_familia.replace(' ', '_').lower()}.png"
    for a, b in zip(["á","é","í","ó","ú","ñ"], ["a","e","i","o","u","n"]):
        nombre_archivo = nombre_archivo.replace(a, b)
        
    ruta_completa = os.path.join(carpeta_salida, nombre_archivo)
    imagen_pase.save(ruta_completa)
    print(f"✅ Pase generado: {ruta_completa}")

# --- ENRUTADOR Y LECTURA DE CSV ---
if not os.path.exists('invitados.csv'):
    print("❌ Error: No se encontró el archivo 'invitados.csv' en esta carpeta.")
else:
    with open('invitados.csv', mode='r', encoding='utf-8') as archivo_csv:
        lector = csv.DictReader(archivo_csv)
        for fila in lector:
            familia = fila['Familia']
            texto_invitados = fila['InvitadosConfirmados']
            numero_pases = fila.get('TotalAsistentes', 1) 
            # Leemos la columna 'Mesa' del CSV
            mesa = fila.get('Mesa', 'S/N')
            
            generar_imagen_pase(familia, texto_invitados, numero_pases, mesa)
    print("\n🎉 ¡Proceso terminado! Busca tus pases en la carpeta 'pases_digitales'.")
    