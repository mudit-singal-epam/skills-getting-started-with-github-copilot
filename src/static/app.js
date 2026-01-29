document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Preserve the current selection before clearing options
      const previousSelection = activitySelect.value;

      // Clear the select options (keep only the placeholder)
      while (activitySelect.options.length > 1) {
        activitySelect.remove(1);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build activity header and info using DOM APIs
        const titleEl = document.createElement("h4");
        titleEl.textContent = name;
        activityCard.appendChild(titleEl);

        const descriptionEl = document.createElement("p");
        descriptionEl.textContent = details.description;
        activityCard.appendChild(descriptionEl);

        const scheduleEl = document.createElement("p");
        const scheduleStrong = document.createElement("strong");
        scheduleStrong.textContent = "Schedule:";
        scheduleEl.appendChild(scheduleStrong);
        scheduleEl.appendChild(document.createTextNode(" " + details.schedule));
        activityCard.appendChild(scheduleEl);

        const availabilityEl = document.createElement("p");
        const availabilityStrong = document.createElement("strong");
        availabilityStrong.textContent = "Availability:";
        availabilityEl.appendChild(availabilityStrong);
        availabilityEl.appendChild(
          document.createTextNode(" " + spotsLeft + " spots left")
        );
        activityCard.appendChild(availabilityEl);

        // Participants section
        const participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";

        const participantsLabel = document.createElement("strong");
        participantsLabel.textContent = "Participants:";
        participantsSection.appendChild(participantsLabel);

        if (details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";

          details.participants.forEach((p) => {
            const li = document.createElement("li");

            const span = document.createElement("span");
            span.textContent = p;
            li.appendChild(span);

            const button = document.createElement("button");
            button.className = "delete-btn";
            button.textContent = "✕";
            button.setAttribute("data-email", p);
            button.setAttribute("data-activity", name);
            button.title = "Remove participant";
            button.setAttribute("aria-label", "Remove participant");

            li.appendChild(button);
            ul.appendChild(li);
          });

          participantsSection.appendChild(ul);
        } else {
          const noParticipantsP = document.createElement("p");
          noParticipantsP.className = "no-participants";
          const em = document.createElement("em");
          em.textContent = "No participants yet";
          noParticipantsP.appendChild(em);
          participantsSection.appendChild(noParticipantsP);
        }

        activityCard.appendChild(participantsSection);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Restore the previous selection if it still exists
      if (previousSelection) {
        // Check if an option with this value exists
        const optionExists = Array.from(activitySelect.options).some(
          option => option.value === previousSelection
        );
        if (optionExists) {
          activitySelect.value = previousSelection;
        }
      }

      // Add event listeners for delete buttons
      document.querySelectorAll(".delete-btn").forEach(button => {
        button.addEventListener("click", async (event) => {
          event.preventDefault();
          const email = button.dataset.email;
          const activity = button.dataset.activity;

          try {
            const response = await fetch(
              `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
              {
                method: "POST",
              }
            );

            const result = await response.json();

            if (response.ok) {
              // Refresh activities list to reflect the change
              fetchActivities();
            } else {
              console.error("Error unregistering:", result.detail);
              alert(`Error: ${result.detail || "Failed to unregister"}`);
            }
          } catch (error) {
            console.error("Error unregistering:", error);
            alert("Failed to unregister. Please try again.");
          }
        });
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities list to show the new participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
