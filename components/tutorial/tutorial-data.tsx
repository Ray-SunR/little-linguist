export type TutorialStep = {
    id: string;
    targetId: string; // Keep for legacy/fallback
    dataTourTarget?: string; // New standard
    title: string;
    content: string;
    route: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    actionRequired?: boolean;
    requiresAuth?: boolean;
    skipIfAuth?: boolean;
};

export const TUTORIAL_STEPS: TutorialStep[] = [
    // 1. Library Introduction (Overall Page Welcome)
    {
        id: 'library-welcome',
        targetId: 'library-page-header',
        dataTourTarget: 'library-page-header',
        title: 'Welcome to the Magic Library!',
        content: 'Here you\'ll find a vast collection of enchanting stories tailored just for your little ones. From adventures to bedtime tales, there\'s something for every young reader!',
        route: '/library',
        position: 'bottom'
    },
    // 2. Library Filters (The Toolbar)
    {
        id: 'library-filters',
        targetId: 'library-filters',
        dataTourTarget: 'library-filters',
        title: 'Your Magic Compass',
        content: 'Use these powerful filters to find the perfect story. Filter by reading level, story type, or reading time to discover tales that match your child\'s interests!',
        route: '/library',
        position: 'bottom'
    },
    // 3. Category Selection
    {
        id: 'library-category',
        targetId: 'library-category-btn',
        dataTourTarget: 'library-category-btn',
        title: 'Explore Magical Worlds',
        content: 'Tap here to browse 15+ story categories — from Dinosaurs to Space Adventures, Mythology to Minecraft! And we\'re always adding more magical realms to explore!',
        route: '/library',
        position: 'bottom'
    },
    // 4. Choose a Book
    {
        id: 'library-book-list',
        targetId: 'first-book',
        dataTourTarget: 'first-book',
        title: 'Open Your First Book',
        content: 'Tap on this book cover to open the Magic Reader. Go ahead, let\'s see what\'s inside!',
        route: '/library',
        position: 'top',
        actionRequired: true
    },
    // 4. Reader Play
    {
        id: 'reader-play-btn',
        targetId: 'reader-play-btn',
        dataTourTarget: 'reader-play-btn',
        title: 'Hear the Magic',
        content: 'Tap the Play button to hear the story come to life with magical narration.',
        route: '/reader/*',
        position: 'bottom',
        actionRequired: true // User requested it be interactive
    },
    // 5. Discover Words
    {
        id: 'reader-text-content',
        targetId: 'first-word',
        dataTourTarget: 'first-word',
        title: 'Find Hidden Secrets',
        content: 'Tap on the word "pixelated" to see its meaning and hear how it sounds!',
        route: '/reader/*',
        position: 'top',
        actionRequired: true
    },
    // 6. Master the Sound
    {
        id: 'word-pronunciation',
        targetId: 'word-pronunciation-btn',
        dataTourTarget: 'word-pronunciation-btn',
        title: 'Master the Sound',
        content: 'Tap the word to hear its magical pronunciation. Speak it out loud to become a word master!',
        route: '/reader/*',
        position: 'bottom',
        actionRequired: true
    },
    // 7. Hear Definition (NEW)
    {
        id: 'word-definition-audio',
        targetId: 'word-definition-audio',
        dataTourTarget: 'word-definition-audio',
        title: 'Listen to the Meaning',
        content: 'Tap the speaker to hear what the word means. Learning is magic!',
        route: '/reader/*',
        position: 'bottom',
        actionRequired: true
    },
    // 8. Hear Example (NEW)
    {
        id: 'word-example-audio',
        targetId: 'word-example-audio',
        dataTourTarget: 'word-example-audio',
        title: 'See it in Action',
        content: 'Hear how the word is used in a sentence. Notice how words are highlighted as they are pronounced!',
        route: '/reader/*',
        position: 'bottom',
        actionRequired: true
    },
    // 9. Save Word (MOVED)
    {
        id: 'word-save',
        targetId: 'word-save-btn',
        dataTourTarget: 'word-save-btn',
        title: 'Keep the Magic',
        content: 'Tap the Star to save this word to your Treasure Chest. Gather words to fuel your own stories!',
        route: '/reader/*',
        position: 'bottom',
        actionRequired: true
    },
    // 10. Read From Here (NEW)
    {
        id: 'word-read-from-here',
        targetId: 'word-read-from-here',
        dataTourTarget: 'word-read-from-here',
        title: 'Continue the Journey',
        content: 'Done exploring? Tap "Read from here" to continue the story from this very spot!',
        route: '/reader/*',
        position: 'top',
        actionRequired: true
    },
    // 10b. Back to Library (NEW)
    {
        id: 'reader-back-to-library',
        targetId: 'reader-back-to-library',
        dataTourTarget: 'reader-back-to-library',
        title: 'Return to the Library',
        content: 'Finished exploring the reader? Tap the back arrow anytime to choose another magical adventure!',
        route: '/reader/*',
        position: 'bottom'
    },
    // 11. Your Magic Friend (Lumo)
    {
        id: 'nav-item-lumo',
        targetId: 'nav-item-lumo-character',
        dataTourTarget: 'nav-item-lumo-character',
        title: 'Meet Lumo, Your Magic Friend!',
        content: 'Tap Lumo to expand your magic menu! Tap again to fold it back away.',
        route: '*',
        position: 'top',
        actionRequired: true
    },
    // 11b. Back to Library
    {
        id: 'nav-item-library',
        targetId: 'nav-item-library',
        dataTourTarget: 'nav-item-library',
        title: 'Return to the Library',
        content: 'Finished reading? Tap here to go back and choose another adventure!',
        route: '*',
        position: 'top'
    },
    // 12. Visit Your Treasury
    {
        id: 'word-list-nav',
        targetId: 'nav-item-words',
        dataTourTarget: 'nav-item-words',
        title: 'See Your Magic Words',
        content: 'Tap here to see all the magic words you\'ve found! Even as a visitor, you can explore your collection here.',
        route: '/my-words',
        position: 'top'
    },
    // 13. Treasury Verification
    {
        id: 'treasury-check',
        targetId: 'first-saved-word',
        dataTourTarget: 'first-saved-word',
        title: 'Your Word Collection',
        content: 'There it is! Every word you save is kept here like a rare gem. Collect more to unlock new powers!',
        route: '/my-words',
        position: 'bottom'
    },
    // 14. Story Maker Nav (The Pitch)
    {
        id: 'story-maker-nav',
        targetId: 'nav-item-story',
        dataTourTarget: 'nav-item-story',
        title: 'Warp to Story Maker',
        content: 'Ready to create? Use your found words to weave your very own magical tales. Let\'s see how it works!',
        route: '/story-maker',
        position: 'top'
    },
    // 15. Story Maker Profile
    {
        id: 'story-profile',
        targetId: 'story-next-step',
        dataTourTarget: 'story-next-step',
        title: 'Choose the Hero',
        content: 'Tell us who this story is for! Once you\'re ready, tap Next Step to pick your magic words.',
        route: '/story-maker',
        position: 'top',
        actionRequired: true
    },
    // 16. Story Maker Word Selection
    {
        id: 'story-word-selection',
        targetId: 'story-word-grid',
        dataTourTarget: 'story-word-grid',
        title: 'Pick Magic Words',
        // Make it informational so they can click next after reading
        content: 'Select the words you want to weave into your story! These will guide the adventure.',
        route: '/story-maker',
        position: 'top',
        actionRequired: false
    },
    // 17. Story Maker Create
    {
        id: 'story-create',
        targetId: 'story-create-btn',
        dataTourTarget: 'story-create-btn',
        title: 'Cast the Spell',
        content: 'Pick your favorite words and tap Cast Spell to bring your original story to life!',
        route: '/story-maker',
        position: 'top',
        actionRequired: true,
        requiresAuth: true
    },
    // 17. Magic in Progress
    {
        id: 'story-generating',
        targetId: 'story-generating-status',
        dataTourTarget: 'story-generating-status',
        title: 'Magic is Brewing...',
        content: 'Our AI wizards are drawing pictures and writing words just for you. This might take a moment!',
        route: '/story-maker',
        position: 'bottom'
    },
    // 18. Success in Reader
    {
        id: 'story-success',
        targetId: 'reader-play-btn',
        dataTourTarget: 'reader-play-btn',
        title: 'Your Legend is Born!',
        content: 'Congratulations! You\'ve created your very first magical book. You can find it anytime in your Library.',
        route: '/reader/*',
        position: 'bottom'
    },
    // 19. Final Step: Save & Sync
    {
        id: 'final-login',
        targetId: 'nav-item-library',
        dataTourTarget: 'nav-item-library',
        title: 'Keep Your Magic Safe',
        content: 'One last thing: Log in to save your stories and words forever. Ready to become a permanent Legend?',
        route: '/library',
        position: 'bottom',
        skipIfAuth: true
    }
];
