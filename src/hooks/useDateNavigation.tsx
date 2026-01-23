import { useState, useCallback } from 'react';

export const useDateNavigation = () => {

    const [currentDate, setCurrentDate] = useState(new Date());

    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const goToPreviousMonth = useCallback(() => {
        
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() - 1);
            return newDate;
        });

    }, []);

    const goToNextMonth = useCallback(() => {
        
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + 1);
            return newDate;
        });

    }, []);

    const goToToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    const monthNames = [
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const formattedMonthYear = `${monthNames[currentDate.getMonth()]} ${currentYear}`;

    return {
        currentDate,
        currentMonth,
        currentYear,
        formattedMonthYear,
        goToPreviousMonth,
        goToNextMonth,
        goToToday
    };
}