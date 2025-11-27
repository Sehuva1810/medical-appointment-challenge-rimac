# Guía de Contribución

## Estrategia de Branching

Usamos **Git Flow** simplificado:

```
main (producción)
  │
  └── develop (desarrollo)
        │
        ├── feature/nombre-feature
        ├── bugfix/nombre-bug
        └── hotfix/nombre-hotfix
```

### Branches

| Branch | Propósito | Base | Merge a |
|--------|-----------|------|---------|
| `main` | Producción estable | - | - |
| `develop` | Desarrollo activo | main | main |
| `feature/*` | Nueva funcionalidad | develop | develop |
| `bugfix/*` | Corrección de bugs | develop | develop |
| `hotfix/*` | Fix urgente producción | main | main + develop |

## Convención de Commits

Usamos **Conventional Commits**:

```
<tipo>(<scope>): <descripción>

[cuerpo opcional]

[footer opcional]
```

### Tipos

| Tipo | Descripción |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Documentación |
| `style` | Formato (no afecta código) |
| `refactor` | Refactoring |
| `test` | Agregar tests |
| `chore` | Tareas de mantenimiento |
| `perf` | Mejoras de rendimiento |
| `ci` | Cambios de CI/CD |

### Ejemplos

```bash
feat(appointments): agregar endpoint de cancelación
fix(validation): corregir validación de insuredId
docs(readme): actualizar instrucciones de instalación
refactor(domain): extraer Value Objects
test(handlers): agregar tests para CreateAppointmentHandler
```

## Flujo de Trabajo

### 1. Crear Branch

```bash
# Desde develop
git checkout develop
git pull origin develop
git checkout -b feature/mi-feature
```

### 2. Desarrollar

```bash
# Commits pequeños y frecuentes
git add .
git commit -m "feat(scope): descripción"
```

### 3. Sincronizar

```bash
# Mantener actualizado con develop
git fetch origin
git rebase origin/develop
```

### 4. Push y PR

```bash
git push origin feature/mi-feature
# Crear PR en GitHub
```

### 5. Code Review

- Mínimo 1 aprobación requerida
- CI debe pasar (lint, tests, build)
- Sin conflictos

### 6. Merge

- Usar **Squash and Merge** para features
- Usar **Merge Commit** para releases

## Versionado

Usamos **Semantic Versioning** (SemVer):

```
MAJOR.MINOR.PATCH
```

| Cambio | Cuándo incrementar |
|--------|-------------------|
| MAJOR | Cambios incompatibles (breaking changes) |
| MINOR | Nueva funcionalidad compatible |
| PATCH | Bug fixes compatibles |

### Tags

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

## Checklist Pre-PR

- [ ] Tests pasan localmente (`npm test`)
- [ ] Lint pasa (`npm run lint`)
- [ ] Build exitoso (`npm run build`)
- [ ] Documentación actualizada si aplica
- [ ] Commits siguen convención
- [ ] Branch actualizado con develop

## Code Style

- ESLint + Prettier configurados
- Ejecutar antes de commit: `npm run lint`
- Pre-commit hooks con Husky

## Testing

- Tests unitarios: `npm test`
- Tests E2E: `npm run test:e2e`
- Coverage mínimo: 80%
