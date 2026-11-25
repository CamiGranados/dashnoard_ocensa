import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MenuItem } from 'primeng/api';
import { Avatar } from 'primeng/avatar';
import { Button, ButtonDirective } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Menu } from 'primeng/menu';
import { Select } from 'primeng/select';
import { TableModule, TablePageEvent } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';
import { CuentaAutorizada } from '../../core/models/cuenta-autorizada.model';
import { CuentasAutorizadasService } from '../../core/services/cuentas-autorizadas.service';
import { CardHeader } from '../../shared/components/card-header/card-header';
import { FechaRelativaPipe } from '../../shared/pipes/fecha-relativa.pipe';
import {
  ESTADO_CONFIG,
  EstadoVista,
  FILAS_POR_PAGINA,
  ROL_CONFIG,
  RolVista,
  inicialesDe,
  normalizarTexto,
} from './user-list.config';

/** Fila de la tabla: la cuenta + lo que se pinta de ella, resuelto una sola vez. */
interface FilaCuenta {
  cuenta: CuentaAutorizada;
  iniciales: string;
  rol: RolVista;
  estado: EstadoVista;
  /** Nombre, correo, IP, rol y estado ya normalizados (ver `normalizarTexto`). */
  textoBusqueda: string;
}

/**
 * Directorio operativo de cuentas autorizadas. Paginación del lado del cliente (igual que las
 * tablas de `physicochemistry`/`thps-tolerance`); el pie lo arma el paginador de `p-table` con
 * sus plantillas `paginatorleft` / `paginatorright`.
 */
@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TableModule,
    Avatar,
    Button,
    ButtonDirective,
    InputText,
    Menu,
    Select,
    Tag,
    Tooltip,
    CardHeader,
    FechaRelativaPipe,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.css',
})
export class UserList {
  private readonly cuentasService = inject(CuentasAutorizadasService);

  protected readonly total = this.cuentasService.total;

  private readonly filas = computed<FilaCuenta[]>(() =>
    this.cuentasService.cuentas().map((cuenta) => {
      const rol = ROL_CONFIG[cuenta.rol];
      const estado = ESTADO_CONFIG[cuenta.estado];
      return {
        cuenta,
        iniciales: inicialesDe(cuenta.nombre),
        rol,
        estado,
        textoBusqueda: normalizarTexto(
          [cuenta.nombre, cuenta.email, cuenta.ipUltimoAcceso, rol.label, estado.label].join(' '),
        ),
      };
    }),
  );

  // --- Búsqueda (cliente) ---
  protected readonly busqueda = signal('');

  protected readonly filasFiltradas = computed(() => {
    const termino = normalizarTexto(this.busqueda().trim());
    const filas = this.filas();
    return termino ? filas.filter((f) => f.textoBusqueda.includes(termino)) : filas;
  });

  protected readonly totalFiltrado = computed(() => this.filasFiltradas().length);

  protected onBuscar(texto: string): void {
    this.busqueda.set(texto);
    this.primero.set(0);
  }

  onFiltrar(): void {
    // TODO: abrir filtros avanzados (rol, estado, MFA) cuando se definan.
  }

  // --- Paginación ---
  protected readonly opcionesFilas = FILAS_POR_PAGINA.map((n) => ({ label: `${n} / pág`, value: n }));
  protected readonly filasPorPagina = signal<number>(FILAS_POR_PAGINA[0]);
  protected readonly primero = signal(0);

  /** "Mostrando {desde}-{hasta} de {total filtrado}". */
  protected readonly rango = computed(() => {
    const total = this.totalFiltrado();
    if (total === 0) return { desde: 0, hasta: 0 };
    const primero = this.primero();
    return { desde: primero + 1, hasta: Math.min(primero + this.filasPorPagina(), total) };
  });

  protected onPage(evento: TablePageEvent): void {
    this.primero.set(evento.first);
    this.filasPorPagina.set(evento.rows);
  }

  protected cambiarFilasPorPagina(filas: number): void {
    this.filasPorPagina.set(filas);
    this.primero.set(0);
  }

  // --- Menú "más acciones" (una sola instancia de p-menu para todas las filas) ---
  private cuentaDelMenu: CuentaAutorizada | null = null;

  protected readonly menuItems: MenuItem[] = [
    {
      label: 'Restablecer MFA',
      icon: 'pi pi-key',
      command: () => this.conCuentaDelMenu((c) => this.onRestablecerMfa(c)),
    },
    {
      label: 'Cambiar terminal',
      icon: 'pi pi-desktop',
      command: () => this.conCuentaDelMenu((c) => this.onCambiarTerminal(c)),
    },
    { separator: true },
    {
      label: 'Suspender cuenta',
      icon: 'pi pi-ban',
      state: { peligro: true },
      command: () => this.conCuentaDelMenu((c) => this.onSuspenderCuenta(c)),
    },
  ];

  protected abrirMenu(evento: Event, menu: Menu, cuenta: CuentaAutorizada): void {
    this.cuentaDelMenu = cuenta;
    menu.toggle(evento);
  }

  private conCuentaDelMenu(accion: (cuenta: CuentaAutorizada) => void): void {
    if (this.cuentaDelMenu) accion(this.cuentaDelMenu);
  }

  // --- Acciones (placeholders) ---

  onAgregarUsuario(): void {
    // TODO: abrir el formulario de alta de cuenta (nombre, correo corporativo, rol).
  }

  onEditar(cuenta: CuentaAutorizada): void {
    // TODO: abrir el formulario de edición de la cuenta (rol, estado, datos de contacto).
  }

  onVerHistorial(cuenta: CuentaAutorizada): void {
    // TODO: mostrar el historial de accesos (fecha, IP, terminal) de la cuenta.
  }

  onRestablecerMfa(cuenta: CuentaAutorizada): void {
    // TODO: confirmar y solicitar al backend el restablecimiento del MFA.
  }

  onCambiarTerminal(cuenta: CuentaAutorizada): void {
    // TODO: abrir el selector de terminal asignada a la cuenta.
  }

  onSuspenderCuenta(cuenta: CuentaAutorizada): void {
    // TODO: confirmar (p-confirmDialog) y suspender la cuenta en el backend.
  }
}
