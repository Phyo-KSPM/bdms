"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useLocale } from "@/components/i18n/locale-provider"
import { DEMO_CREDENTIALS, writeAuthSession } from "@/lib/auth"

const content: Record<
  "en" | "mm",
  {
    title: string
    subtitle: string
    username: string
    usernamePlaceholder: string
    password: string
    passwordPlaceholder: string
    forgotPassword: string
    hidePassword: string
    showPassword: string
    rememberMe: string
    login: string
    continueWith: string
    loginWithGithub: string
    noAccount: string
    signUp: string
    invalidCredentials: string
    demoHint: string
  }
> = {
  en: {
    title: "Login to your account",
    subtitle: "Enter your username and password to continue",
    username: "Username",
    usernamePlaceholder: "Enter username",
    password: "Password",
    passwordPlaceholder: "Enter password",
    forgotPassword: "Forgot your password?",
    hidePassword: "Hide password",
    showPassword: "Show password",
    rememberMe: "Remember me",
    login: "Login",
    continueWith: "Or continue with",
    loginWithGithub: "Login with GitHub",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    invalidCredentials: "Invalid username or password.",
    demoHint: "Use admin / demo123",
  },
  mm: {
    title: "သင့်အကောင့်သို့ ဝင်ရန်",
    subtitle: "ဆက်လက်ဝင်ရန် username နှင့် password ဖြည့်ပါ",
    username: "အသုံးပြုသူအမည်",
    usernamePlaceholder: "အသုံးပြုသူအမည်ထည့်ပါ",
    password: "စကားဝှက်",
    passwordPlaceholder: "စကားဝှက်ထည့်ပါ",
    forgotPassword: "စကားဝှက်မေ့နေပါသလား?",
    hidePassword: "စကားဝှက်ဖျောက်မည်",
    showPassword: "စကားဝှက်ပြမည်",
    rememberMe: "ကျွန်ုပ်ကို မှတ်ထားပါ",
    login: "ဝင်ရန်",
    continueWith: "သို့မဟုတ်",
    loginWithGithub: "GitHub ဖြင့် ဝင်ရန်",
    noAccount: "အကောင့်မရှိသေးဘူးလား?",
    signUp: "စာရင်းသွင်းရန်",
    invalidCredentials: "အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မမှန်ပါ။",
    demoHint: "admin / demo123 ကိုသုံးပါ",
  },
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { locale } = useLocale()
  const router = useRouter()
  const t = content[locale]
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage("")

    const isValidUser =
      username.trim() === DEMO_CREDENTIALS.username &&
      password === DEMO_CREDENTIALS.password

    if (!isValidUser) {
      setErrorMessage(t.invalidCredentials)
      return
    }

    writeAuthSession({ username: DEMO_CREDENTIALS.username })
    router.push("/dashboard")
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm text-balance text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="username">{t.username}</FieldLabel>
          <Input
            id="username"
            type="text"
            placeholder={t.usernamePlaceholder}
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">{t.password}</FieldLabel>
            <a
              href="#"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              {t.forgotPassword}
            </a>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder={t.passwordPlaceholder}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? t.hidePassword : t.showPassword}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </Field>
        <Field>
          <label
            htmlFor="remember-me"
            className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
          >
            <Checkbox id="remember-me" name="rememberMe" />
            <span>{t.rememberMe}</span>
          </label>
        </Field>
        <Field>
          <Button type="submit">{t.login}</Button>
        </Field>
        <Field>
          <p className="text-center text-xs text-muted-foreground">{t.demoHint}</p>
          {errorMessage ? (
            <p className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </Field>
        <FieldSeparator>{t.continueWith}</FieldSeparator>
        <Field>
          <Button variant="outline" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                fill="currentColor"
              />
            </svg>
            {t.loginWithGithub}
          </Button>
          <FieldDescription className="text-center">
            {t.noAccount}{" "}
            <a href="#" className="underline underline-offset-4">
              {t.signUp}
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
