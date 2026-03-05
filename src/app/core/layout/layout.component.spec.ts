import { TestBed }          from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { provideRouter }    from '@angular/router';
import { Router }           from '@angular/router';
import { signal }           from '@angular/core';

import { LayoutComponent } from './layout.component';
import { AuthService }     from '../auth/auth.service';
import { TokenPayload }    from '../models/auth.model';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUser(): TokenPayload {
  return {
    sub:  'admin@bizcore.com',
    role: 'Administrador',
    exp:  Math.floor(Date.now() / 1000) + 3600,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('LayoutComponent', () => {
  let fixture:          ComponentFixture<LayoutComponent>;
  let component:        LayoutComponent;
  // Referencia al spy de navigate — se crea en beforeEach sobre el Router real
  let routerNavigate:   ReturnType<typeof vi.spyOn>;

  // Signal mutable para el usuario — permite cambiar el estado por test
  let fakeCurrentUser = signal<TokenPayload | null>(makeUser());

  // AuthService falso — reemplaza la inyección real sin tocar el backend
  const authServiceSpy = {
    currentUser: fakeCurrentUser.asReadonly(),
    isLoggedIn:  vi.fn().mockReturnValue(true),
    logout:      vi.fn(),
  };

  beforeEach(async () => {
    fakeCurrentUser.set(makeUser());

    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        // provideRouter([]) activa RouterOutlet, RouterLink y RouterLinkActive.
        // NO reemplazamos el token Router con un spy porque eso rompe las
        // dependencias internas del router que esas directivas necesitan.
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    // Espiamos navigate sobre el Router REAL — después de que DI lo haya construido.
    // vi.spyOn reemplaza solo el método, dejando el resto del router intacto.
    const router  = TestBed.inject(Router);
    routerNavigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture   = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ─── Creación ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── Estado inicial del sidebar ───────────────────────────────────────────

  it('should start with the sidebar expanded', () => {
    expect(component.sidebarCollapsed()).toBe(false);
  });

  it('should NOT have layout--collapsed class initially', () => {
    const root = fixture.nativeElement.querySelector('.layout') as HTMLElement;
    expect(root.classList.contains('layout--collapsed')).toBe(false);
  });

  // ─── toggleSidebar ────────────────────────────────────────────────────────

  it('should collapse the sidebar when toggleSidebar is called', () => {
    component.toggleSidebar();
    expect(component.sidebarCollapsed()).toBe(true);
  });

  it('should expand the sidebar when toggleSidebar is called twice', () => {
    component.toggleSidebar();
    component.toggleSidebar();
    expect(component.sidebarCollapsed()).toBe(false);
  });

  it('should apply layout--collapsed class when sidebar is collapsed', () => {
    component.toggleSidebar();
    fixture.detectChanges();

    const root = fixture.nativeElement.querySelector('.layout') as HTMLElement;
    expect(root.classList.contains('layout--collapsed')).toBe(true);
  });

  // ─── logout ───────────────────────────────────────────────────────────────

  it('should call authService.logout when logout is called', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalledOnce();
  });

  it('should navigate to /login after logout', () => {
    component.logout();
    expect(routerNavigate).toHaveBeenCalledWith(['/login']);
  });

  // ─── Navbar: datos del usuario ────────────────────────────────────────────

  it('should display the user email in the navbar', () => {
    const usernameEl = fixture.nativeElement.querySelector('.navbar__username') as HTMLElement;
    expect(usernameEl.textContent?.trim()).toBe('admin@bizcore.com');
  });

  it('should display the user role in the navbar', () => {
    const roleEl = fixture.nativeElement.querySelector('.navbar__role') as HTMLElement;
    expect(roleEl.textContent?.trim()).toBe('Administrador');
  });

  it('should show empty navbar user info when there is no session', () => {
    fakeCurrentUser.set(null);
    fixture.detectChanges();

    const usernameEl = fixture.nativeElement.querySelector('.navbar__username') as HTMLElement;
    const roleEl     = fixture.nativeElement.querySelector('.navbar__role') as HTMLElement;

    expect(usernameEl.textContent?.trim()).toBe('');
    expect(roleEl.textContent?.trim()).toBe('');
  });
});
