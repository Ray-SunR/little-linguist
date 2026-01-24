import React from 'react';

interface MagicSliderProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (val: number) => void;
    color: 'indigo' | 'amber';
    statusLabel?: string;
}

const MagicSlider: React.FC<MagicSliderProps> = ({ label }) => {
    return (
        <div>
            <label>{label}</label>
        </div>
    );
};

export default MagicSlider;
