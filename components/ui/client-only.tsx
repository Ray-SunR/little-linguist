"use client";

import { useEffect, useState, ReactNode } from "react";

interface ClientOnlyProps {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * A utility component that ensures its children are only rendered on the client.
 * This is useful for components that rely on browser-only APIs or React Contexts
 * that might not be available during SSR (like AuthProvider context in some layouts).
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
