from django.urls import path

from dashboard.views import BranchOperationsView, GlobalOverviewView

app_name = "dashboard"

urlpatterns = [
    path("global-overview/", GlobalOverviewView.as_view(), name="global_overview"),
    path("branch-operations/", BranchOperationsView.as_view(), name="branch_operations"),
]
