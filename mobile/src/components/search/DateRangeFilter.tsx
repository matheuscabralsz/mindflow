import React, { useState } from 'react';
import {
  IonButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonDatetime,
  IonText,
} from '@ionic/react';
import { format } from 'date-fns';
import './DateRangeFilter.css';

interface DateRangeFilterProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(endDate);

  const handleApply = () => {
    onDateRangeChange(tempStartDate, tempEndDate);
    setShowModal(false);
  };

  const handleClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    onDateRangeChange(null, null);
    setShowModal(false);
  };

  const formatDateLabel = () => {
    if (!startDate && !endDate) return 'All Time';
    if (startDate && !endDate) return `From ${format(startDate, 'MMM d, yyyy')}`;
    if (!startDate && endDate) return `Until ${format(endDate, 'MMM d, yyyy')}`;
    return `${format(startDate!, 'MMM d')} - ${format(endDate!, 'MMM d, yyyy')}`;
  };

  return (
    <>
      <IonButton fill="outline" size="small" onClick={() => setShowModal(true)}>
        <IonText>{formatDateLabel()}</IonText>
      </IonButton>

      <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Date Range</IonTitle>
            <IonButtons slot="start">
              <IonButton onClick={() => setShowModal(false)}>Cancel</IonButton>
            </IonButtons>
            <IonButtons slot="end">
              <IonButton onClick={handleClear}>Clear</IonButton>
              <IonButton strong onClick={handleApply}>
                Apply
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <IonList>
            <IonItem>
              <IonLabel position="stacked">Start Date</IonLabel>
              <IonDatetime
                value={tempStartDate?.toISOString()}
                onIonChange={(e) => setTempStartDate(e.detail.value ? new Date(e.detail.value as string) : null)}
                presentation="date"
                max={tempEndDate?.toISOString()}
              />
            </IonItem>

            <IonItem>
              <IonLabel position="stacked">End Date</IonLabel>
              <IonDatetime
                value={tempEndDate?.toISOString()}
                onIonChange={(e) => setTempEndDate(e.detail.value ? new Date(e.detail.value as string) : null)}
                presentation="date"
                min={tempStartDate?.toISOString()}
              />
            </IonItem>
          </IonList>

          <div className="date-range-presets">
            <IonButton
              expand="block"
              fill="clear"
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today);
                lastWeek.setDate(today.getDate() - 7);
                setTempStartDate(lastWeek);
                setTempEndDate(today);
              }}
            >
              Last 7 Days
            </IonButton>

            <IonButton
              expand="block"
              fill="clear"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today);
                lastMonth.setMonth(today.getMonth() - 1);
                setTempStartDate(lastMonth);
                setTempEndDate(today);
              }}
            >
              Last 30 Days
            </IonButton>

            <IonButton
              expand="block"
              fill="clear"
              onClick={() => {
                const today = new Date();
                const lastYear = new Date(today);
                lastYear.setFullYear(today.getFullYear() - 1);
                setTempStartDate(lastYear);
                setTempEndDate(today);
              }}
            >
              Last Year
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </>
  );
};
