import { AppLayout } from "@/components/layout/app-layout";

export default function SponsorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AppLayout>
            <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
                <div className="inline-block max-w-lg text-center justify-center">
                    {children}
                </div>
            </section>
        </AppLayout>
    );
}

