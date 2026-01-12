import { ReaderContainer } from "./ReaderContainer";
import ReaderContent from "./ReaderContent";

interface ReaderPageProps {
    params: { id: string };
}

export default async function ReaderDetailPage({ params }: ReaderPageProps) {
    const bookId = params.id;

    // We don't have access to useAuth here, but we can potentially get the session 
    // from cookies if we needed it. However, ReaderContainer will handle 
    // fetching based on the current user's available books.

    return (
        <ReaderContainer bookId={bookId}>
            {({ initialBook, error }) => (
                <ReaderContent
                    bookId={bookId}
                    initialBook={initialBook}
                    initialError={error}
                />
            )}
        </ReaderContainer>
    ) as any;
}
