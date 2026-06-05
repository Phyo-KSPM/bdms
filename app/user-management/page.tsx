"use client"

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import {
  PlusIcon,
  PencilIcon,
  Trash2Icon,
  ShieldCheckIcon,
  UsersIcon,
  ScrollTextIcon,
  SettingsIcon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react"

import { AuthedShell } from "@/components/authed-shell"
import { useLocale } from "@/components/i18n/locale-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { readAuthSession } from "@/lib/auth"
import {
  ALL_PERMISSIONS,
  appendAuditLog,
  clearAuditLogs,
  createRoleIdPreview,
  createUserIdPreview,
  deleteRole,
  deleteUser,
  getRoleById,
  getRoleLabel,
  getSecuritySettings,
  listAuditLogs,
  listRoles,
  listUsers,
  PERMISSION_LABELS,
  resetRolesToDefault,
  resetUsersToSeed,
  saveSecuritySettings,
  setRolePermission,
  upsertRole,
  upsertUser,
  UserStatusSchema,
  type AuditLogEntry,
  type Permission,
  type RoleDefinition,
  type SecuritySettings,
  type User,
} from "@/lib/user-store"

const UserFormSchema = z.object({
  id: z.string(),
  username: z.string().min(3, "Username must be at least 3 characters"),
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  role: z.string().min(1, "Role is required"),
  status: UserStatusSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type UserFormValues = z.infer<typeof UserFormSchema>

const RoleFormSchema = z.object({
  id: z.string().min(1),
  labelEn: z.string().min(1, "English name is required"),
  labelMm: z.string().min(1, "Myanmar name is required"),
})

type RoleFormValues = z.infer<typeof RoleFormSchema>

function formatDateTime(value: string | undefined, locale: string) {
  if (!value) return "—"
  return new Date(value).toLocaleString(locale === "mm" ? "my-MM" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export default function Page() {
  const { locale } = useLocale()
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<RoleDefinition[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(
    getSecuritySettings()
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleDefinition | null>(null)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null)
  const [formError, setFormError] = useState("")
  const [roleFormError, setRoleFormError] = useState("")
  const [showPasswordInForm, setShowPasswordInForm] = useState(false)
  const [showPasswordsInTable, setShowPasswordsInTable] = useState(false)

  const session = readAuthSession()
  const isAdmin = session?.role === "admin"

  const t = useMemo(() => {
    if (locale === "en") {
      return {
        shellTitle: "User Management & Security",
        subtitle: "Manage staff accounts, roles, and security settings",
        usersTab: "Users",
        rolesTab: "Roles & Permissions",
        securityTab: "Security",
        auditTab: "Audit Log",
        addUser: "Add User",
        editUser: "Edit User",
        refresh: "Refresh",
        resetSeed: "Reset Demo Users",
        clearAudit: "Clear Audit Log",
        username: "Username",
        displayName: "Display Name",
        email: "Email",
        role: "Role",
        status: "Status",
        password: "Password",
        showPassword: "Show password",
        hidePassword: "Hide password",
        showPasswords: "Show passwords",
        hidePasswords: "Hide passwords",
        lastLogin: "Last Login",
        actions: "Actions",
        active: "Active",
        inactive: "Inactive",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        emptyUsers: "No users found.",
        deleteTitle: "Delete user?",
        deleteDesc: (name: string) =>
          `This will permanently remove ${name}. This action cannot be undone.`,
        forbiddenTitle: "Access restricted",
        forbiddenDesc:
          "You need administrator access to manage users and security settings.",
        securityTitle: "Security policy",
        securityDesc: "Configure password rules and session timeout.",
        minPasswordLength: "Minimum password length",
        requireUppercase: "Require uppercase letter",
        requireNumber: "Require number",
        sessionTimeout: "Session timeout (minutes)",
        maxLoginAttempts: "Max login attempts",
        saveSecurity: "Save security settings",
        roleMatrixTitle: "Role permission matrix",
        roleMatrixDesc: "Toggle permissions for each role. Changes save immediately.",
        addRole: "Add Role",
        editRole: "Edit Role",
        roleNameEn: "Role name (English)",
        roleNameMm: "Role name (Myanmar)",
        roleId: "Role ID",
        resetRoles: "Reset Default Roles",
        deleteRoleTitle: "Delete role?",
        deleteRoleDesc: (name: string) =>
          `This will permanently remove the role "${name}".`,
        roleLocked: "System role",
        permissionsCount: (count: number) => `${count} permissions`,
        permissionToggleError: "Could not update permission.",
        permission: "Permission",
        auditTitle: "Recent activity",
        auditDesc: "Login and user management events.",
        auditAction: "Action",
        auditActor: "Actor",
        auditTarget: "Target",
        auditTime: "Time",
        auditEmpty: "No audit entries yet.",
        saved: "Saved successfully.",
        demoAccounts: "Demo accounts: admin / clerk / labtech (password: demo123)",
      } as const
    }

    return {
      shellTitle: "အသုံးပြုသူ စီမံခန့်ခွဲမှု နှင့် လုံခြုံရေး",
      subtitle: "ဝန်ထမ်း account များ၊ role များနှင့် security settings များ",
      usersTab: "အသုံးပြုသူများ",
      rolesTab: "Role နှင့် Permission",
      securityTab: "Security",
      auditTab: "Audit Log",
      addUser: "User အသစ်",
      editUser: "User ပြင်မည်",
      refresh: "Refresh",
      resetSeed: "Demo Users ပြန်ထား",
      clearAudit: "Audit Log ရှင်းမည်",
      username: "Username",
      displayName: "အမည်",
      email: "Email",
      role: "Role",
      status: "Status",
      password: "Password",
      showPassword: "စကားဝှက်ပြမည်",
      hidePassword: "စကားဝှက်ဖျောက်မည်",
      showPasswords: "Password များ ပြမည်",
      hidePasswords: "Password များ ဖျောက်မည်",
      lastLogin: "နောက်ဆုံး Login",
      actions: "လုပ်ဆောင်ချက်",
      active: "Active",
      inactive: "Inactive",
      save: "သိမ်းမည်",
      cancel: "ပယ်မည်",
      delete: "ဖျက်မည်",
      emptyUsers: "User မရှိသေးပါ။",
      deleteTitle: "User ကို ဖျက်မလား?",
      deleteDesc: (name: string) =>
        `${name} ကို အပြီးဖျက်ပါမည်။ ပြန်မရနိုင်ပါ။`,
      forbiddenTitle: "ခွင့်ပြုချက် မရှိပါ",
      forbiddenDesc:
        "User နှင့် security settings စီမံခန့်ခွဲရန် administrator access လိုအပ်ပါသည်။",
      securityTitle: "Security policy",
      securityDesc: "Password rule နှင့် session timeout သတ်မှတ်ပါ။",
      minPasswordLength: "Password အနည်းဆုံး length",
      requireUppercase: "Capital letter လိုအပ်",
      requireNumber: "Number လိုအပ်",
      sessionTimeout: "Session timeout (မိနစ်)",
      maxLoginAttempts: "Login ကြိုးစားမှု အများဆုံး",
      saveSecurity: "Security settings သိမ်းမည်",
      roleMatrixTitle: "Role permission matrix",
      roleMatrixDesc: "Role တစ်ခုချင်းစီအတွက် permission များ toggle လုပ်နိုင်ပါသည်။",
      addRole: "Role အသစ်",
      editRole: "Role ပြင်မည်",
      roleNameEn: "Role အမည် (English)",
      roleNameMm: "Role အမည် (Myanmar)",
      roleId: "Role ID",
      resetRoles: "Default Roles ပြန်ထား",
      deleteRoleTitle: "Role ကို ဖျက်မလား?",
      deleteRoleDesc: (name: string) =>
        `"${name}" role ကို အပြီးဖျက်ပါမည်။`,
      roleLocked: "System role",
      permissionsCount: (count: number) => `permission ${count} ခု`,
      permissionToggleError: "Permission update မအောင်မြင်ပါ။",
      permission: "Permission",
      auditTitle: "လတ်တလော activity",
      auditDesc: "Login နှင့် user management events များ။",
      auditAction: "Action",
      auditActor: "Actor",
      auditTarget: "Target",
      auditTime: "အချိန်",
      auditEmpty: "Audit entry မရှိသေးပါ။",
      saved: "သိမ်းပြီးပါပြီ။",
      demoAccounts:
        "Demo accounts: admin / clerk / labtech (password: demo123)",
    } as const
  }, [locale])

  const form = useForm<UserFormValues>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      id: "",
      username: "",
      displayName: "",
      email: "",
      role: "viewer",
      status: "active",
      password: "",
    },
  })

  const roleForm = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormSchema),
    defaultValues: {
      id: "",
      labelEn: "",
      labelMm: "",
    },
  })

  const loadData = () => {
    setUsers(listUsers())
    setRoles(listRoles())
    setAuditLogs(listAuditLogs())
    setSecuritySettings(getSecuritySettings())
  }

  useEffect(() => {
    setIsLoading(true)
    loadData()
    setIsLoading(false)
  }, [])

  const openCreateDialog = () => {
    setEditingUser(null)
    setFormError("")
    const defaultRole = roles[0]?.id ?? "viewer"
    form.reset({
      id: createUserIdPreview(),
      username: "",
      displayName: "",
      email: "",
      role: defaultRole,
      status: "active",
      password: "",
    })
    setIsDialogOpen(true)
    setShowPasswordInForm(false)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormError("")
    form.reset({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email ?? "",
      role: user.role,
      status: user.status,
      password: user.password,
    })
    setIsDialogOpen(true)
    setShowPasswordInForm(false)
  }

  const onSubmit = (values: UserFormValues) => {
    try {
      setFormError("")
      upsertUser({
        ...values,
        email: values.email ?? "",
      })
      if (session) {
        appendAuditLog({
          actorId: session.userId,
          actorName: session.displayName,
          action: editingUser ? "user.update" : "user.create",
          target: values.username,
          details: `${values.displayName} (${values.role})`,
        })
      }
      setIsDialogOpen(false)
      loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to save user.")
    }
  }

  const confirmDelete = () => {
    if (!deleteTarget || !session) return
    try {
      deleteUser(deleteTarget.id)
      appendAuditLog({
        actorId: session.userId,
        actorName: session.displayName,
        action: "user.delete",
        target: deleteTarget.username,
        details: deleteTarget.displayName,
      })
      setDeleteTarget(null)
      loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to delete user.")
      setDeleteTarget(null)
    }
  }

  const handleSaveSecurity = () => {
    saveSecuritySettings(securitySettings)
    if (session) {
      appendAuditLog({
        actorId: session.userId,
        actorName: session.displayName,
        action: "security.update",
        details: "Security policy updated",
      })
    }
    loadData()
  }

  const handleResetUsers = () => {
    resetUsersToSeed()
    if (session) {
      appendAuditLog({
        actorId: session.userId,
        actorName: session.displayName,
        action: "users.reset",
        details: "Demo users restored",
      })
    }
    loadData()
  }

  const handleClearAudit = () => {
    clearAuditLogs()
    loadData()
  }

  const openCreateRoleDialog = () => {
    setEditingRole(null)
    setRoleFormError("")
    roleForm.reset({
      id: createRoleIdPreview("custom_role"),
      labelEn: "",
      labelMm: "",
    })
    setIsRoleDialogOpen(true)
  }

  const openEditRoleDialog = (role: RoleDefinition) => {
    setEditingRole(role)
    setRoleFormError("")
    roleForm.reset({
      id: role.id,
      labelEn: role.labelEn,
      labelMm: role.labelMm,
    })
    setIsRoleDialogOpen(true)
  }

  const onSubmitRole = (values: RoleFormValues) => {
    try {
      setRoleFormError("")
      const existing = editingRole ?? getRoleById(values.id)
      upsertRole({
        id: values.id,
        labelEn: values.labelEn,
        labelMm: values.labelMm,
        permissions: existing?.permissions ?? [],
        locked: existing?.locked,
      })
      if (session) {
        appendAuditLog({
          actorId: session.userId,
          actorName: session.displayName,
          action: editingRole ? "role.update" : "role.create",
          target: values.id,
          details: values.labelEn,
        })
      }
      setIsRoleDialogOpen(false)
      loadData()
    } catch (error) {
      setRoleFormError(
        error instanceof Error ? error.message : "Failed to save role."
      )
    }
  }

  const confirmDeleteRole = () => {
    if (!deleteRoleTarget || !session) return
    try {
      deleteRole(deleteRoleTarget.id)
      appendAuditLog({
        actorId: session.userId,
        actorName: session.displayName,
        action: "role.delete",
        target: deleteRoleTarget.id,
        details: deleteRoleTarget.labelEn,
      })
      setDeleteRoleTarget(null)
      loadData()
    } catch (error) {
      setRoleFormError(
        error instanceof Error ? error.message : "Failed to delete role."
      )
      setDeleteRoleTarget(null)
    }
  }

  const handleTogglePermission = (
    roleId: string,
    permission: Permission,
    enabled: boolean
  ) => {
    try {
      setRoleFormError("")
      setRolePermission(roleId, permission, enabled)
      if (session) {
        appendAuditLog({
          actorId: session.userId,
          actorName: session.displayName,
          action: "role.permission",
          target: roleId,
          details: `${permission} ${enabled ? "enabled" : "disabled"}`,
        })
      }
      loadData()
    } catch (error) {
      setRoleFormError(
        error instanceof Error ? error.message : t.permissionToggleError
      )
    }
  }

  const handleResetRoles = () => {
    resetRolesToDefault()
    if (session) {
      appendAuditLog({
        actorId: session.userId,
        actorName: session.displayName,
        action: "roles.reset",
        details: "Default roles restored",
      })
    }
    loadData()
  }

  const roleOptions = roles

  if (isLoading) {
    return (
      <AuthedShell title={t.shellTitle} requiredPermission="users.manage">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </AuthedShell>
    )
  }

  if (!isAdmin) {
    return (
      <AuthedShell title={t.shellTitle}>
        <Card>
          <CardHeader>
            <CardTitle>{t.forbiddenTitle}</CardTitle>
            <CardDescription>{t.forbiddenDesc}</CardDescription>
          </CardHeader>
        </Card>
      </AuthedShell>
    )
  }

  return (
    <AuthedShell title={t.shellTitle} requiredPermission="users.manage">
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t.shellTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t.demoAccounts}</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">
              <UsersIcon className="size-4" />
              {t.usersTab}
            </TabsTrigger>
            <TabsTrigger value="roles">
              <ShieldCheckIcon className="size-4" />
              {t.rolesTab}
            </TabsTrigger>
            <TabsTrigger value="security">
              <SettingsIcon className="size-4" />
              {t.securityTab}
            </TabsTrigger>
            <TabsTrigger value="audit">
              <ScrollTextIcon className="size-4" />
              {t.auditTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCreateDialog}>
                <PlusIcon className="size-4" />
                {t.addUser}
              </Button>
              <Button variant="outline" onClick={loadData}>
                <RefreshCwIcon className="size-4" />
                {t.refresh}
              </Button>
              <Button variant="outline" onClick={handleResetUsers}>
                {t.resetSeed}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPasswordsInTable((prev) => !prev)}
              >
                {showPasswordsInTable ? (
                  <EyeOffIcon className="size-4" />
                ) : (
                  <EyeIcon className="size-4" />
                )}
                {showPasswordsInTable ? t.hidePasswords : t.showPasswords}
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.username}</TableHead>
                        <TableHead>{t.displayName}</TableHead>
                        <TableHead>{t.role}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead className="hidden lg:table-cell">
                          {t.password}
                        </TableHead>
                        <TableHead className="hidden md:table-cell">
                          {t.lastLogin}
                        </TableHead>
                        <TableHead className="text-right">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                            {t.emptyUsers}
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>
                              <div>{user.displayName}</div>
                              {user.email ? (
                                <div className="text-xs text-muted-foreground">
                                  {user.email}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {getRoleLabel(user.role, locale)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.status === "active" ? "default" : "outline"
                                }
                              >
                                {user.status === "active" ? t.active : t.inactive}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden font-mono text-sm lg:table-cell">
                              {showPasswordsInTable ? user.password : "••••••••"}
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                              {formatDateTime(user.lastLoginAt, locale)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => openEditDialog(user)}
                                >
                                  <PencilIcon className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setDeleteTarget(user)}
                                  disabled={user.id === session?.userId}
                                >
                                  <Trash2Icon className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCreateRoleDialog}>
                <PlusIcon className="size-4" />
                {t.addRole}
              </Button>
              <Button variant="outline" onClick={loadData}>
                <RefreshCwIcon className="size-4" />
                {t.refresh}
              </Button>
              <Button variant="outline" onClick={handleResetRoles}>
                {t.resetRoles}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t.rolesTab}</CardTitle>
                <CardDescription>{t.roleMatrixDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.role}</TableHead>
                        <TableHead>{t.roleId}</TableHead>
                        <TableHead>{t.permission}</TableHead>
                        <TableHead className="text-right">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => (
                        <TableRow key={role.id}>
                          <TableCell>
                            <div className="font-medium">
                              {locale === "mm" ? role.labelMm : role.labelEn}
                            </div>
                            {role.locked ? (
                              <div className="text-xs text-muted-foreground">
                                {t.roleLocked}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {role.id}
                          </TableCell>
                          <TableCell>{t.permissionsCount(role.permissions.length)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditRoleDialog(role)}
                              >
                                <PencilIcon className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setDeleteRoleTarget(role)}
                                disabled={Boolean(role.locked)}
                              >
                                <Trash2Icon className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {roleFormError ? (
              <p className="text-sm text-destructive">{roleFormError}</p>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>{t.roleMatrixTitle}</CardTitle>
                <CardDescription>{t.roleMatrixDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.permission}</TableHead>
                        {roles.map((role) => (
                          <TableHead key={role.id} className="min-w-28 text-center">
                            {locale === "mm" ? role.labelMm : role.labelEn}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ALL_PERMISSIONS.map((permission) => (
                        <TableRow key={permission}>
                          <TableCell>{PERMISSION_LABELS[permission][locale]}</TableCell>
                          {roles.map((role) => {
                            const checked = role.permissions.includes(permission)
                            const lockedAdminPermission =
                              role.id === "admin" &&
                              permission === "users.manage"
                            return (
                              <TableCell key={`${permission}-${role.id}`} className="text-center">
                                <Checkbox
                                  checked={checked}
                                  disabled={lockedAdminPermission}
                                  onCheckedChange={(value) =>
                                    handleTogglePermission(
                                      role.id,
                                      permission,
                                      value === true
                                    )
                                  }
                                  aria-label={`${role.labelEn} ${permission}`}
                                />
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t.securityTitle}</CardTitle>
                <CardDescription>{t.securityDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.minPasswordLength}</label>
                    <Input
                      type="number"
                      min={6}
                      max={32}
                      value={securitySettings.minPasswordLength}
                      onChange={(event) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          minPasswordLength: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.sessionTimeout}</label>
                    <Input
                      type="number"
                      min={15}
                      max={480}
                      value={securitySettings.sessionTimeoutMinutes}
                      onChange={(event) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          sessionTimeoutMinutes: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t.maxLoginAttempts}</label>
                    <Input
                      type="number"
                      min={3}
                      max={10}
                      value={securitySettings.maxLoginAttempts}
                      onChange={(event) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          maxLoginAttempts: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <span className="text-sm">{t.requireUppercase}</span>
                    <Switch
                      checked={securitySettings.requireUppercase}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          requireUppercase: checked,
                        }))
                      }
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <span className="text-sm">{t.requireNumber}</span>
                    <Switch
                      checked={securitySettings.requireNumber}
                      onCheckedChange={(checked) =>
                        setSecuritySettings((prev) => ({
                          ...prev,
                          requireNumber: checked,
                        }))
                      }
                    />
                  </label>
                </div>

                <Button onClick={handleSaveSecurity}>{t.saveSecurity}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={loadData}>
                <RefreshCwIcon className="size-4" />
                {t.refresh}
              </Button>
              <Button variant="outline" onClick={handleClearAudit}>
                {t.clearAudit}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t.auditTitle}</CardTitle>
                <CardDescription>{t.auditDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.auditTime}</TableHead>
                        <TableHead>{t.auditActor}</TableHead>
                        <TableHead>{t.auditAction}</TableHead>
                        <TableHead className="hidden md:table-cell">
                          {t.auditTarget}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            {t.auditEmpty}
                          </TableCell>
                        </TableRow>
                      ) : (
                        auditLogs.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDateTime(entry.at, locale)}
                            </TableCell>
                            <TableCell>{entry.actorName}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{entry.action}</Badge>
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                              {entry.target ?? entry.details ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? t.editUser : t.addUser}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.username}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.displayName}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.email}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.role}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {locale === "mm" ? role.labelMm : role.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.status}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t.active}</SelectItem>
                        <SelectItem value="inactive">{t.inactive}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.password}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPasswordInForm ? "text" : "password"}
                          autoComplete="new-password"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswordInForm((prev) => !prev)}
                          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                          aria-label={
                            showPasswordInForm ? t.hidePassword : t.showPassword
                          }
                        >
                          {showPasswordInForm ? (
                            <EyeOffIcon className="size-4" />
                          ) : (
                            <EyeIcon className="size-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t.cancel}
                </Button>
                <Button type="submit">{t.save}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRole ? t.editRole : t.addRole}</DialogTitle>
          </DialogHeader>
          <Form {...roleForm}>
            <form
              onSubmit={roleForm.handleSubmit(onSubmitRole)}
              className="space-y-4"
            >
              <FormField
                control={roleForm.control}
                name="labelEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.roleNameEn}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(event) => {
                          field.onChange(event)
                          if (!editingRole) {
                            roleForm.setValue(
                              "id",
                              createRoleIdPreview(event.target.value)
                            )
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={roleForm.control}
                name="labelMm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.roleNameMm}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={roleForm.control}
                name="id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.roleId}</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={Boolean(editingRole?.locked)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {roleFormError ? (
                <p className="text-sm text-destructive">{roleFormError}</p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRoleDialogOpen(false)}
                >
                  {t.cancel}
                </Button>
                <Button type="submit">{t.save}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t.deleteDesc(deleteTarget.displayName) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteRoleTarget)}
        onOpenChange={() => setDeleteRoleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteRoleTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRoleTarget
                ? t.deleteRoleDesc(
                    locale === "mm"
                      ? deleteRoleTarget.labelMm
                      : deleteRoleTarget.labelEn
                  )
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRole}>
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthedShell>
  )
}
