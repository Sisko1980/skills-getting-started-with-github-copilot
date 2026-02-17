document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: attach delete handler to a delete button
  function attachDeleteHandler(btn) {
    btn.addEventListener("click", async () => {
      const email = btn.dataset.email;
      const activityName = btn.dataset.activity;
      try {
        const res = await fetch(
          `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );
        const result = await res.json();
        if (res.ok) {
          messageDiv.textContent = result.message;
          messageDiv.className = "message success";
          messageDiv.classList.remove("hidden");
          setTimeout(() => messageDiv.classList.add("hidden"), 3000);
          // refresh full list to keep UI consistent
          fetchActivities();
        } else {
          messageDiv.textContent = result.detail || "Failed to remove participant";
          messageDiv.className = "message error";
          messageDiv.classList.remove("hidden");
        }
      } catch (err) {
        messageDiv.textContent = "Failed to remove participant";
        messageDiv.className = "message error";
        messageDiv.classList.remove("hidden");
        console.error("Error removing participant:", err);
      }
    });
  }

  // Update UI for a single activity when a participant is added locally
  function addParticipantToActivityUI(activityName, email) {
    // find the activity card by title
    const card = Array.from(document.querySelectorAll('.activity-card')).find(c => c.querySelector('h4') && c.querySelector('h4').textContent === activityName);
    if (!card) return;

    const list = card.querySelector('.participants-list');
    if (!list) return;

    // remove "No participants" placeholder if present
    const placeholder = list.querySelector('.no-participants');
    if (placeholder) placeholder.remove();

    // create new list item
    const li = document.createElement('li');
    li.innerHTML = `<span class="participant-email">${email}</span><button class="delete-btn" data-activity="${activityName}" data-email="${email}" title="Remove participant">×</button>`;
    list.appendChild(li);

    // attach delete handler to the newly added button
    const btn = li.querySelector('.delete-btn');
    if (btn) attachDeleteHandler(btn);

    // decrement availability text
    const availEl = card.querySelector('.availability');
    if (availEl) {
      // extract number and decrement
      const m = availEl.textContent.match(/(\d+)\s*spots?/i);
      if (m) {
        const newVal = Math.max(0, parseInt(m[1], 10) - 1);
        availEl.innerHTML = `<strong>Availability:</strong> ${newVal} spots left`;
      }
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and reset activity selector
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants:</strong>
            <ul class="participants-list">
              ${details.participants.length
                ? details.participants.map(email => `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}" title="Remove participant">×</button></li>`).join('')
                : '<li class="no-participants">No participants</li>'}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);

        // Attach delete handlers for participants
        activityCard.querySelectorAll(".delete-btn").forEach((btn) => attachDeleteHandler(btn));
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
        messageDiv.className = "message success";
        signupForm.reset();
        // immediately update the UI for the affected activity and also refresh full list
        addParticipantToActivityUI(activity, email);
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
