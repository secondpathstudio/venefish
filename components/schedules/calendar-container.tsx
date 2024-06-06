'use client';
import { FC, useState } from "react";
import { useAuth, useFirestore, useFirestoreCollection, useFirestoreCollectionData, useFirestoreDoc } from "reactfire";
import { Timestamp, addDoc, collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { getAcademicMonthNumber, getMonth } from "@/lib/CONSTANTS";
import ScheduleCalendar from "./schedule-calendar";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DatePickerDialog } from "../ui/datepickerDialog";
import { set } from "date-fns";
import { DateRange } from "react-day-picker";
import { start } from "repl";

export const CalendarContainer: FC = () => {
  //get the topic data from the database
  const firestore = useFirestore();
  const auth = useAuth();
  const [currentMonth, setCurrentMonth] = useState<number>(getAcademicMonthNumber(new Date().getMonth()));
  const [showAddEventDialog, setShowAddEventDialog] = useState<boolean>(false);
  const [updating, setUpdating] = useState<boolean>(false);
  const schedulesCollection = collection(firestore, "schedules");
  const { status: schedulesStatus, data: schedules } = useFirestoreCollectionData(schedulesCollection, {
    idField: 'id',
  });
  const [newEvent, setNewEvent] = useState<any>({
    title: '',
    startDate: new Date(),
    endDate: new Date(),
  });


  if (schedulesStatus === "loading") {
    return <div>Loading calendar...</div>;
  }

  const handleNewEvent = (dateRange: DateRange | undefined) => {
    if (dateRange === undefined) {
      return;
    }

    setNewEvent({
      ...newEvent,
      startDate: dateRange.from,
      endDate: dateRange.to,
    });
  }

  const handleChangeMonth = (newDate: Date) => {
    const newMonthNumber = getAcademicMonthNumber(newDate.getMonth());
    setCurrentMonth(newMonthNumber);
    console.log(newMonthNumber)
  }

  const handleAddEvent = async () => {
    //add new event to firestore
    //get the schedule document to check if schedule for the month already exists
    setUpdating(true);
    const scheduleMonth = getAcademicMonthNumber(newEvent.startDate.getMonth());
    const scheduleToUpdate = schedules.find((s: any) => s.month === scheduleMonth);
  
    if (scheduleToUpdate === undefined) {
      //need to make new schedule document
      //get topicId for month
      const topicsCollection = collection(firestore, "topics");
      const topicsQuery = query(topicsCollection, where('topicNumber', '==', scheduleMonth));
      const querySnapshot = await getDocs(topicsQuery);
      if (querySnapshot.empty) {
        alert('No topic found for this month');
        return;
      }
      const topicId = querySnapshot.docs[0].id;      
      
      //create a new schedule doc
      setDoc(doc(firestore, "schedules", topicId), {
        month: scheduleMonth,
        events: [{
          title: newEvent.title,
          start: newEvent.startDate.toISOString().slice(0, 10),
          end: newEvent.endDate.toISOString().slice(0, 10),
          startDate: Timestamp.fromDate(newEvent.startDate),
          endDate: Timestamp.fromDate(newEvent.endDate),
          createdBy: {
            uid: auth.currentUser?.uid,
            name: auth.currentUser?.displayName,
          },
          id: Date.now().toString(),
        }],
        lastUpdated: Timestamp.now(),
      });

      setUpdating(false);
      return;
    }

    //found schedule doc - update current schedule with the new event
    let newEvents = scheduleToUpdate.events;
    if (newEvents === undefined) {
      newEvents = [];
    }
    newEvents.push({
      title: newEvent.title,
      start: newEvent.startDate.toISOString().slice(0, 10),
      end: newEvent.endDate.toISOString().slice(0, 10),
      startDate: Timestamp.fromDate(newEvent.startDate),
      endDate: Timestamp.fromDate(newEvent.endDate),
      createdBy: auth.currentUser?.uid,
      id: Date.now().toString(),
    });

    //sort the events by start date
    newEvents.sort((a: any, b: any) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

    //update the schedule in firestore
    const scheduleDoc = doc(firestore, "schedules", scheduleToUpdate.id);
    setDoc(scheduleDoc, {
      events: newEvents,
      lastUpdated: Timestamp.now(),
    }, { merge: true });
    
    setUpdating(false);
  }

  const handleEventDelete = async (id: string, startDate: Date) => {
    try {
        const scheduleMonth = getAcademicMonthNumber(startDate.getMonth());
        const scheduleToUpdate = schedules.find((s: any) => s.month === scheduleMonth);
        if (scheduleToUpdate === undefined) {
            alert('No schedule found for this month');
            return;
        }

        console.log('deleting event from schedule: ', scheduleToUpdate);
        const newEvents = scheduleToUpdate.events.filter((e: any) => e.id !== id);
        const scheduleDoc = doc(firestore, "schedules", scheduleToUpdate.id);
        await setDoc(scheduleDoc, {
            events: newEvents,
        }, { merge: true });
    } catch (error) {
        console.error('Error deleting event: ', error)
    }
}

  return (
    <>
    <div className="flex-col md:flex">
        <div className="flex items-end justify-between space-y-2 mb-6">
          <h2 className="text-3xl leading-5 font-bold tracking-tight">
            Master Schedule
          </h2>
          <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
            <DialogTrigger>
              <Button>Add Event</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Event</DialogTitle>
                <DialogDescription>
                  Add a new event to the calendar
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Event Title
                  </Label>
                  <Input
                    id="name"
                    defaultValue="New Event"
                    className="col-span-3"
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="username" className="text-right">
                    Event Date
                  </Label>
                  <DatePickerDialog 
                    onSelect={(dateRange: DateRange | undefined) => {handleNewEvent(dateRange)}}
                    selectedDate={new Date()} />

                </div>
              </div>
              <DialogFooter>
                {updating ? <p>Updating...</p>
                :
                <Button 
                  type="submit" 
                  onClick={() => {
                    handleAddEvent()
                    setShowAddEventDialog(false)
                  }
                }
                >Save changes</Button>
                }
              </DialogFooter>
          </DialogContent>
          </Dialog>
          
        </div>
        <div className="flex flex-col gap-4">
          <ScheduleCalendar 
            topicNumber={currentMonth} 
            events={schedules?.find((s: any) => s.month === currentMonth)?.events || []} 
            handleChangeMonth={handleChangeMonth}
            handleEventDelete={handleEventDelete}
            />
        </div>
    </div>
    </>
  );
};