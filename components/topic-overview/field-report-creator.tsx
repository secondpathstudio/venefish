'use client';
import { FC, useState } from "react";
import { MainNav } from "@/components/dashboard/main-nav";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  LinkCard,
} from "@/components/ui/card";
import { CreateMCQuestionForm }  from "./create-mc-question-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CreateTFQuestionForm } from "./create-tf-question-form";
import { DatePicker } from "../ui/datepicker";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useAuth, useFirestore } from "reactfire";
import { toast } from "../ui/use-toast";
import { Timestamp, addDoc, collection } from "firebase/firestore";

interface FieldReportCreatorProps {
    topicId: string;
}

export const FieldReportCreator: FC<FieldReportCreatorProps> = (props) => {
  const firestore = useFirestore();
  const fieldReportsCollection = collection(firestore, "fieldReports");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldReport, setFieldReport] = useState({
    reportText: "",
    reportTitle: "",
    activity: "",
    activityDate: Timestamp.now().toDate(),
    topicId: props.topicId ? props.topicId : "unknownTopicId",
  })

  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (auth.currentUser === null) {
      toast({
        title: "You need to be logged in to create a field report.",
      })
      setIsLoading(false);
      return;
    }

    //upload report to firestore "fieldReports" collection with auto generated id
    try {
      const newReportRef = await addDoc(fieldReportsCollection, {
        ...fieldReport,
        authorId: auth.currentUser.uid,
        createdAt: Timestamp.now(),
      });
      toast({
        title: "Report created",
        description: `Field report created successfully! ID: ${newReportRef.id}`,
      });

    } catch (error : any) {
      //TODO use toast
      console.log(error)
    }

    //reset question
    setFieldReport({
      reportText: "",
      reportTitle: "",
      activity: "",
      activityDate: Timestamp.now().toDate(),
      topicId: props.topicId ? props.topicId : "unknownTopicId",
    });

    setIsLoading(false);
  }


  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="pb-2">Field Report Creator</CardTitle>
      </CardHeader>
      <CardContent className="flex-col gap-10">
      <form onSubmit={handleSubmit}>
      <fieldset disabled={isLoading} className="space-y-4">
        {/* Date of Field report */}
        <DatePicker 
          onSelect={(date) => setFieldReport({...fieldReport, activityDate: date})}
        />

        {/* Type of activity */}
        <Select 
          onValueChange={(v) => setFieldReport({...fieldReport, activity: v})}
          value={fieldReport.activity}
          >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Activity Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="SAR">Search and Rescue</SelectItem>
              <SelectItem value="Didactics">Didactics</SelectItem>
              <SelectItem value="Diving">Diving</SelectItem>
              <SelectItem value="Hiking">Hiking</SelectItem>
              <SelectItem value="Camping">Camping</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Title of report */}
        <Input 
          placeholder="Title of Report" 
          onChange={(e) => setFieldReport({...fieldReport, reportTitle: e.target.value})}
          value={fieldReport.reportTitle}
          />

        {/* body of report */}
        <Textarea 
          placeholder="Body of Report" 
          onChange={(e) => setFieldReport({...fieldReport, reportText: e.target.value})}
          value={fieldReport.reportText}
          />

        {/* Submit button */}
        <Button>Create Report</Button>
        </fieldset>
        </form>
      </CardContent>
    </Card>
  );
};