const {createApp} = Vue

createApp({
  el: '#app',
  data() {
    return {
      categories: [], symptoms: [], causes: [], treatments: [],
          selected_category: null,
          current_symptom:
              {name: '', description: 'First, choose a category above'},
          answered_symptoms: [], filtered_symptoms: [], filtered_causes: [],
          filtered_treatments: [], answered_symptoms_checked: false
    }
  },
  methods: {
    getMostRelevantSymptom() {
      const nb_causes = this.filtered_causes.length > 0 ? this.filtered_causes :
                                                          this.causes.length;
      symptom = null;
      if (this.filtered_symptoms.length != 0) {
        // get the symptom with nb of causes closest to half of the nb of causes
        symptom = this.filtered_symptoms.reduce((a, b) => {
          return Math.abs(a.causesIds.length - nb_causes / 2) <
                  Math.abs(b.causesIds.length - nb_causes / 2) ?
              a :
              b;
        });
      }
      return symptom;
    },
    getCategoriesFromSymptomIds(symptomIds) {
      return symptomIds.map((symptomId) => {
        return this.symptoms.find((symptom) => symptom.id == symptomId)
            .category;
      });
    },
    updateCausesAndTreatments(updateSymptoms = true) {
      const eliminated_symptoms_ids = [];
      const validated_symptoms_ids = [];
      this.answered_symptoms.forEach((answered_symptom) => {
        if (answered_symptom.answer === false) {
          eliminated_symptoms_ids.push(answered_symptom.symptom.id);
        } else if (answered_symptom.answer === true) {
          validated_symptoms_ids.push(answered_symptom.symptom.id);
        }
      });

      this.filtered_causes = this.causes.filter((cause) => {
        eliminated = eliminated_symptoms_ids.some((symptom_id) => {
          return cause.symptomIds.includes(symptom_id);
        });
        validated = validated_symptoms_ids.every((symptom_id) => {
          return cause.symptomIds.includes(symptom_id);
        });
        categoryOk = this.selected_category == null ||
            this.getCategoriesFromSymptomIds(cause.symptomIds)
                .includes(this.selected_category);
        return categoryOk && !eliminated && validated;
      });

      this.filtered_treatments = this.treatments.filter((treatment) => {
        return this.filtered_causes.some((cause) => {
          return cause.treatmentIds.includes(treatment.id);
        });
      });

      if (updateSymptoms) {
        this.filtered_symptoms = this.filtered_symptoms.filter((symptom) => {
          return this.filtered_causes.some((cause) => {
            return cause.symptomIds.includes(symptom.id);
          });
        });
      }
    },
    updateCurrentSymptom(answeredSymptom = null) {
      if (answeredSymptom != null) {
        this.current_symptom = answeredSymptom;
        // remove from answered_symptoms
        this.answered_symptoms = this.answered_symptoms.filter(
            (s) => s.symptom.id != this.current_symptom.id);
        this.filtered_symptoms.push(this.current_symptom);
      } else {
        const symptom = this.getMostRelevantSymptom();
        if (symptom) {
          this.current_symptom = symptom;
        } else {
          this.current_symptom = {
            name: '',
            description: 'No more symptoms to ask'
          };
        }
      }
    },
    answerQuery(answer = null) {
      this.answered_symptoms.push(
          {symptom: this.current_symptom, answer: answer});
      // remove the symptom from the list of symptoms to ask
      this.filtered_symptoms = this.filtered_symptoms.filter(
          (symptom) => symptom.name != this.current_symptom.name);
      this.updateCausesAndTreatments();

      this.uncheckAnswer();
      this.updateCurrentSymptom();
    },
    uncheckAnswer() {
      // uncheck all radio buttons with name="answer"
      var radios = document.getElementsByName('answer');
      for (var i = 0; i < radios.length; i++) {
        radios[i].checked = false;
      }
    },
    updateCategory(category = null) {
      this.selected_category = category;

      this.answered_symptoms = [];
      this.filtered_causes = [];
      this.filtered_treatments = [];

      if (category == null) {
        this.filtered_symptoms = this.symptoms;
      } else {
        this.filtered_symptoms = this.symptoms.filter((symptom) => {
          return symptom.category === null ||
              symptom.category == this.selected_category;
        });
      }

      this.uncheckAnswer();
      this.updateCurrentSymptom();
    },
    getCategories(symptoms) {
      const categories = [];
      symptoms.forEach((symptom) => {
        if (symptom.category != null &&
            !categories.includes(symptom.category)) {
          categories.push(symptom.category);
        }
      });
      return categories;
    },
    async fetchData() {
      try {
        const response = await fetch('/api/data');
        const data = await response.json();
        this.categories = this.getCategories(data.symptoms);
        this.symptoms = data.symptoms;
        this.causes = data.causes;
        this.treatments = data.treatments;
        this.updateCategory(this.selected_category);
      } catch (error) {
        console.error(error);
      }
    }
  },
  created() {
    this.fetchData();
  }
}).mount('#app')
